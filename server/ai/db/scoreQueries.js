const pool = require('./connection');

/**
 * Insert a score record for a resume.
 * Returns the inserted row ID.
 */
async function insertScore(resumeId, scoreObj) {
  const [result] = await pool.execute(
    `INSERT INTO resume_scores
       (resume_id, total_score, completeness_score, skills_score, education_score,
        experience_score, projects_score, contact_score, ats_score, score_breakdown_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resumeId,
      scoreObj.total_score,
      scoreObj.completeness_score,
      scoreObj.skills_score,
      scoreObj.education_score,
      scoreObj.experience_score,
      scoreObj.projects_score,
      scoreObj.contact_score,
      scoreObj.ats_score,
      JSON.stringify(scoreObj.score_breakdown_json || {}),
    ]
  );
  return result.insertId;
}

/**
 * Get the most recent score for a resume.
 */
async function getLatestScore(resumeId) {
  const [rows] = await pool.execute(
    'SELECT * FROM resume_scores WHERE resume_id = ? ORDER BY scored_at DESC LIMIT 1',
    [resumeId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  if (typeof row.score_breakdown_json === 'string') {
    try { row.score_breakdown_json = JSON.parse(row.score_breakdown_json); } catch { row.score_breakdown_json = {}; }
  }
  return row;
}

/**
 * Get all scores for a resume (history).
 */
async function getScoreHistory(resumeId) {
  const [rows] = await pool.execute(
    'SELECT * FROM resume_scores WHERE resume_id = ? ORDER BY scored_at DESC',
    [resumeId]
  );
  return rows.map(row => {
    if (typeof row.score_breakdown_json === 'string') {
      try { row.score_breakdown_json = JSON.parse(row.score_breakdown_json); } catch { row.score_breakdown_json = {}; }
    }
    return row;
  });
}

module.exports = { insertScore, getLatestScore, getScoreHistory };
