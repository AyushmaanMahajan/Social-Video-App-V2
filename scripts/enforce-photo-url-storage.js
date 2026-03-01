require('dotenv').config();
const pool = require('../src/lib/db');

async function enforcePhotoUrlStorage() {
  try {
    const deleted = await pool.query(
      `
      DELETE FROM photos
      WHERE url ILIKE 'data:%'
      RETURNING id
      `
    );

    await pool.query(
      `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'photos_url_http_check'
        ) THEN
          ALTER TABLE photos
          ADD CONSTRAINT photos_url_http_check CHECK (url ~* '^https?://');
        END IF;
      END
      $$;
      `
    );

    await pool.query(
      `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'photos_url_not_data_uri_check'
        ) THEN
          ALTER TABLE photos
          ADD CONSTRAINT photos_url_not_data_uri_check CHECK (url !~* '^data:');
        END IF;
      END
      $$;
      `
    );

    console.log(`Removed ${deleted.rowCount} base64 photo row(s).`);
    console.log('Photo URL constraints are enforced.');
  } catch (error) {
    console.error('Failed to enforce photo URL constraints:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

enforcePhotoUrlStorage();
