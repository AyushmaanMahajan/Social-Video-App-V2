import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST() {
  return Response.json({ error: 'Reporting via matches removed. Use encounter reporting (not implemented).' }, { status: 410 });
}
