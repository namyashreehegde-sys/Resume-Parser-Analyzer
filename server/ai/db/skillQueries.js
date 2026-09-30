const pool = require('./connection');

/**
 * Bulk-insert skills for a resume (ignores duplicates by name+resume_id).
 * skillsArray: [{ name, category }]
 */
async function insertSkills(resumeId, skillsArray) {
  if (!skillsArray || !skillsArray.length) return;
  // Delete existing skills first to avoid stale data on re-parse
  await pool.execute('DELETE FROM resume_skills WHERE resume_id = ?', [resumeId]);

  const values = skillsArray.map(s => [resumeId, s.name, s.category]);
  await pool.query(
    'INSERT INTO resume_skills (resume_id, skill_name, category) VALUES ?',
    [values]
  );
}

/**
 * Get all skills for a resume.
 * Returns [{ skill_name, category }]
 */
async function getSkills(resumeId) {
  const [rows] = await pool.execute(
    'SELECT skill_name, category FROM resume_skills WHERE resume_id = ? ORDER BY category, skill_name',
    [resumeId]
  );
  return rows;
}

module.exports = { insertSkills, getSkills };
