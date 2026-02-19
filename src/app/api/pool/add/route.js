import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST() {
  return Response.json({ error: 'Matches have been removed.' }, { status: 410 });
}
