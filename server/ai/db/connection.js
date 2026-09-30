/**
 * server/ai/db/connection.js
 *
 * Re-uses the backend team's MySQL pool if available at ../../config/db,
 * otherwise creates its own using environment variables.
 */
const mysql = require('mysql2/promise');

let pool;

try {
  // Try to reuse the backend team's pool
  pool = require('../../config/db');
  console.log('[AI DB] Reusing backend MySQL pool');
} catch {
  // Create our own pool
  pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASS     || '',
    database:           process.env.DB_NAME     || 'resume_analyzer',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    timezone:           '+00:00',
  });
  console.log('[AI DB] Created new MySQL pool');
}

module.exports = pool;
