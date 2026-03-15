require('dotenv').config();
const pool = require('../src/lib/db');

async function cleanupDiscoverySessions() {
  try {
    const result = await pool.query(
      `
      DELETE FROM discovery_sessions
      WHERE last_refreshed < NOW() - INTERVAL '24 hours'
      `
    );

    console.log(`Removed ${result.rowCount || 0} stale discovery session(s).`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to clean up discovery sessions:', error);
    process.exit(1);
  }
}

cleanupDiscoverySessions();
