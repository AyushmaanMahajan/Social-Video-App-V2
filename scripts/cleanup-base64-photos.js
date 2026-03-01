require('dotenv').config();
const pool = require('../src/lib/db');

async function cleanupBase64Photos() {
  try {
    const result = await pool.query(
      `
      DELETE FROM photos
      WHERE url ILIKE 'data:%'
      RETURNING id, user_id
      `
    );
    console.log(`Removed ${result.rowCount} base64 photo row(s).`);
  } catch (error) {
    console.error('Failed to clean base64 photos:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

cleanupBase64Photos();
