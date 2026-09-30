const pool = require('./connection');

/**
 * Append a message to the conversation for a resume.
 */
async function insertMessage(resumeId, role, message) {
  const [result] = await pool.execute(
    'INSERT INTO assistant_conversations (resume_id, role, message) VALUES (?, ?, ?)',
    [resumeId, role, message]
  );
  return result.insertId;
}

/**
 * Get the last `limit` messages for a resume, oldest first.
 */
async function getConversation(resumeId, limit = 20) {
  const [rows] = await pool.execute(
    `SELECT role, message, created_at
       FROM assistant_conversations
      WHERE resume_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
    [resumeId, limit]
  );
  // Return in chronological order
  return rows.reverse();
}

module.exports = { insertMessage, getConversation };
