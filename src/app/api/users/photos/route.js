import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const MAX_PHOTOS = 6;
const PHOTO_BLOCKED_TERMS = ['nude', 'nudity', 'porn', 'explicit', 'nsfw', 'sexual'];

const isValidPhotoUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return false;
  if (/^data:/i.test(url)) return false;
  return /^https?:\/\//i.test(url);
};

const passesBasicPhotoModeration = (value) => {
  const url = String(value || '').toLowerCase();
  if (!url) return false;
  return !PHOTO_BLOCKED_TERMS.some((term) => url.includes(term));
};

async function getPhotoUrls(userId) {
  const result = await pool.query(
    'SELECT url FROM photos WHERE user_id = $1 ORDER BY order_index, created_at, id',
    [userId]
  );
  return result.rows.map((row) => row.url);
}

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  try {
    const photos = await getPhotoUrls(auth.userId);
    return Response.json({ photos });
  } catch (error) {
    console.error('GET /api/users/photos error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  try {
    const body = await request.json();
    const url = String(body?.url || '').trim();

    if (!isValidPhotoUrl(url)) {
      return Response.json({ error: 'Invalid photo URL. Only http(s) URLs are allowed.' }, { status: 400 });
    }
    if (!passesBasicPhotoModeration(url)) {
      return Response.json({ error: 'Photo did not pass moderation checks.' }, { status: 400 });
    }

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM photos WHERE user_id = $1', [auth.userId]);
    const total = Number(countResult.rows[0]?.total || 0);
    if (total >= MAX_PHOTOS) {
      return Response.json({ error: `You can upload up to ${MAX_PHOTOS} photos.` }, { status: 400 });
    }

    const maxIndexResult = await pool.query(
      'SELECT COALESCE(MAX(order_index), -1)::int AS max_index FROM photos WHERE user_id = $1',
      [auth.userId]
    );
    const nextIndex = Number(maxIndexResult.rows[0]?.max_index || -1) + 1;

    await pool.query(
      'INSERT INTO photos (user_id, url, order_index) VALUES ($1, $2, $3)',
      [auth.userId, url, nextIndex]
    );

    const photos = await getPhotoUrls(auth.userId);
    return Response.json({ success: true, photos });
  } catch (error) {
    console.error('POST /api/users/photos error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  try {
    const body = await request.json();
    const url = String(body?.url || '').trim();
    const index = Number(body?.index);

    if (!Number.isInteger(index) || index < 0) {
      return Response.json({ error: 'Invalid photo index.' }, { status: 400 });
    }
    if (!isValidPhotoUrl(url)) {
      return Response.json({ error: 'Invalid photo URL. Only http(s) URLs are allowed.' }, { status: 400 });
    }
    if (!passesBasicPhotoModeration(url)) {
      return Response.json({ error: 'Photo did not pass moderation checks.' }, { status: 400 });
    }

    const updateResult = await pool.query(
      'UPDATE photos SET url = $1 WHERE user_id = $2 AND order_index = $3',
      [url, auth.userId, index]
    );

    if (updateResult.rowCount === 0) {
      return Response.json({ error: 'Photo not found for this index.' }, { status: 404 });
    }

    const photos = await getPhotoUrls(auth.userId);
    return Response.json({ success: true, photos });
  } catch (error) {
    console.error('PUT /api/users/photos error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = requireAuth(request);
  if (auth.userId === undefined) return auth;

  try {
    const body = await request.json();
    const index = Number(body?.index);

    if (!Number.isInteger(index) || index < 0) {
      return Response.json({ error: 'Invalid photo index.' }, { status: 400 });
    }

    const deleteResult = await pool.query(
      'DELETE FROM photos WHERE user_id = $1 AND order_index = $2',
      [auth.userId, index]
    );

    if (deleteResult.rowCount === 0) {
      return Response.json({ error: 'Photo not found for this index.' }, { status: 404 });
    }

    await pool.query(
      `
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY order_index, created_at, id) - 1 AS new_order_index
        FROM photos
        WHERE user_id = $1
      )
      UPDATE photos p
      SET order_index = ordered.new_order_index
      FROM ordered
      WHERE p.id = ordered.id
      `,
      [auth.userId]
    );

    const photos = await getPhotoUrls(auth.userId);
    return Response.json({ success: true, photos });
  } catch (error) {
    console.error('DELETE /api/users/photos error', error);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
