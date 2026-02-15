require('dotenv').config();
const pool = require('./src/lib/db');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'config/schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();
