import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateReportReason } from '@/lib/onboardingValidation';

const REPORT_SUSPENSION_THRESHOLD = 3;
const REPORT_WINDOW_HOURS = 24;
const SUSPENSION_HOURS = 24;

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  try {
    const reporterState = await pool.query(
      `
      SELECT email_verified, onboarding_completed
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [auth.userId]
    );
    if (!reporterState.rows.length || !reporterState.rows[0].email_verified) {
      return Response.json({ error: 'Email verification is required.' }, { status: 403 });
    }
    if (!reporterState.rows[0].onboarding_completed) {
      return Response.json({ error: 'Complete onboarding before reporting users.' }, { status: 403 });
    }

    const body = await request.json();
    const reportedUserId = Number(body?.reportedUserId);
    const encounterIdRaw = body?.encounterId;
    const encounterId =
      encounterIdRaw === undefined || encounterIdRaw === null || encounterIdRaw === ''
        ? null
        : Number(encounterIdRaw);
    const reasonCheck = validateReportReason(body?.reason);
    const autoBlock = Boolean(body?.blockUser);

    if (!reportedUserId || Number(reportedUserId) === Number(auth.userId)) {
      return Response.json({ error: 'Invalid reported user.' }, { status: 400 });
    }
    if (!reasonCheck.valid) {
      return Response.json({ error: reasonCheck.error }, { status: 400 });
    }
    if (encounterId !== null && !Number.isFinite(encounterId)) {
      return Response.json({ error: 'Invalid encounter id.' }, { status: 400 });
    }

    const targetExists = await pool.query('SELECT 1 FROM users WHERE id = $1 LIMIT 1', [reportedUserId]);
    if (!targetExists.rows.length) {
      return Response.json({ error: 'Reported user was not found.' }, { status: 404 });
    }

    await pool.query(
      `
      INSERT INTO reports (reporter_id, reported_user_id, encounter_id, reason, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      `,
      [auth.userId, reportedUserId, encounterId, reasonCheck.reason]
    );

    if (autoBlock) {
      await pool.query(
        `
        INSERT INTO blocks (blocker_id, blocked_id)
        VALUES ($1, $2)
        ON CONFLICT (blocker_id, blocked_id) DO NOTHING
        `,
        [auth.userId, reportedUserId]
      );
    }

    const counts = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_reports,
        COUNT(*) FILTER (WHERE created_at >= NOW() - ($2::text || ' hours')::interval)::int AS recent_reports
      FROM reports
      WHERE reported_user_id = $1
      `,
      [reportedUserId, REPORT_WINDOW_HOURS]
    );

    const totalReports = Number(counts.rows[0]?.total_reports || 0);
    const recentReports = Number(counts.rows[0]?.recent_reports || 0);

    let suspensionUntil = null;
    if (recentReports >= REPORT_SUSPENSION_THRESHOLD) {
      const suspensionResult = await pool.query(
        `
        UPDATE users
        SET report_count = $2,
            suspension_until = GREATEST(COALESCE(suspension_until, NOW()), NOW() + ($3::text || ' hours')::interval)
        WHERE id = $1
        RETURNING suspension_until
        `,
        [reportedUserId, totalReports, SUSPENSION_HOURS]
      );
      suspensionUntil = suspensionResult.rows[0]?.suspension_until || null;
    } else {
      await pool.query(
        `
        UPDATE users
        SET report_count = $2
        WHERE id = $1
        `,
        [reportedUserId, totalReports]
      );
    }

    return Response.json({
      success: true,
      moderation: {
        totalReports,
        recentReports,
        suspended: Boolean(suspensionUntil),
        suspensionUntil,
      },
    });
  } catch (error) {
    console.error('encounter report error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
