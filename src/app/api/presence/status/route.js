import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  if (!idsParam) return Response.json({ statuses: [] });
  const ids = idsParam
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n));
  if (!ids.length) return Response.json({ statuses: [] });

  try {
    const res = await pool.query(
      `
      SELECT user_id, online, show_status
      FROM user_presence
      WHERE user_id = ANY($1)
      `,
      [ids]
    );
    return Response.json({
      statuses: res.rows.map((r) => ({
        userId: Number(r.user_id),
        online: Boolean(r.online),
        showStatus: r.show_status !== false,
      })),
    });
  } catch (error) {
    console.error('presence status error', error);
    return Response.json({ statuses: [] });
  }
}
