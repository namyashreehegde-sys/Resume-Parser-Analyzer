/**
 * server/config/env.js
 *
 * Loads environment variables. Call this before anything else.
 * Priority: process.env → .env file (if present, via dotenv)
 */
try {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
} catch {
  // dotenv not available or .env not found — rely on system env vars
}
