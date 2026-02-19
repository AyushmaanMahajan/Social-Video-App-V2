import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  return Response.json({ error: 'Browse has been removed. Use /api/encounter/next.' }, { status: 410 });
}
