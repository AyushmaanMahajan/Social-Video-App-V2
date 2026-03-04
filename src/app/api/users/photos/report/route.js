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
    const body = await request.json();
    const reportedUserId = Number(body?.reportedUserId);
    const photoUrl = String(body?.photoUrl || '').trim();
    const reasonCheck = validateReportReason(body?.reason || 'other');

    if (!reportedUserId || reportedUserId === Number(auth.userId)) {
      return Response.json({ error: 'Invalid reported user.' }, { status: 400 });
    }
    if (!photoUrl || !/^https?:\/\//i.test(photoUrl)) {
      return Response.json({ error: 'A valid photo URL is required.' }, { status: 400 });
    }
    if (!reasonCheck.valid) {
      return Response.json({ error: reasonCheck.error }, { status: 400 });
    }

    const photoOwned = await pool.query(
      `
      SELECT 1
      FROM photos
      WHERE user_id = $1
        AND url = $2
      LIMIT 1
      `,
      [reportedUserId, photoUrl]
    );
    if (!photoOwned.rows.length) {
      return Response.json({ error: 'Photo not found for this user.' }, { status: 404 });
    }

    await pool.query(
      `
      INSERT INTO photo_reports (reporter_id, reported_user_id, photo_url, reason)
      VALUES ($1, $2, $3, $4)
      `,
      [auth.userId, reportedUserId, photoUrl, reasonCheck.reason]
    );

    await pool.query(
      `
      INSERT INTO reports (reporter_id, reported_user_id, reason, encounter_id)
      VALUES ($1, $2, $3, NULL)
      `,
      [auth.userId, reportedUserId, reasonCheck.reason]
    );

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

    if (recentReports >= REPORT_SUSPENSION_THRESHOLD) {
      await pool.query(
        `
        UPDATE users
        SET report_count = $2,
            suspension_until = GREATEST(COALESCE(suspension_until, NOW()), NOW() + ($3::text || ' hours')::interval)
        WHERE id = $1
        `,
        [reportedUserId, totalReports, SUSPENSION_HOURS]
      );
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

    return Response.json({ success: true });
  } catch (error) {
    console.error('photo report error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
