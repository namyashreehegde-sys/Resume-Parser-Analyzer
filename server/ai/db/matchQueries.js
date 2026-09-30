const pool = require('./connection');

/**
 * Insert a job match record. Returns the inserted ID.
 */
async function insertMatch(resumeId, jobTitle, jdText, matchObj) {
  const [result] = await pool.execute(
    `INSERT INTO job_matches
       (resume_id, job_title, job_description_text, match_percentage,
        matched_skills_json, missing_skills_json, keywords_json, suggestions_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resumeId,
      jobTitle || null,
      jdText,
      matchObj.match_percentage,
      JSON.stringify(matchObj.matched_skills || []),
      JSON.stringify(matchObj.missing_skills || []),
      JSON.stringify(matchObj.keywords       || []),
      JSON.stringify(matchObj.suggestions    || []),
    ]
  );
  return result.insertId;
}

/**
 * Get all job matches for a resume.
 */
async function getMatches(resumeId) {
  const [rows] = await pool.execute(
    'SELECT * FROM job_matches WHERE resume_id = ? ORDER BY matched_at DESC',
    [resumeId]
  );
  return rows.map(row => {
    ['matched_skills_json','missing_skills_json','keywords_json','suggestions_json'].forEach(col => {
      if (typeof row[col] === 'string') {
        try { row[col] = JSON.parse(row[col]); } catch { row[col] = []; }
      }
    });
    return row;
  });
}

module.exports = { insertMatch, getMatches };
