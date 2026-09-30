const pool = require('./connection');

/**
 * Insert a new resume record and return its ID.
 */
async function insertResume(originalFilename, fileType, filePath, userId = null) {
  const [result] = await pool.execute(
    'INSERT INTO resumes (user_id, original_filename, file_type, file_path) VALUES (?, ?, ?, ?)',
    [userId, originalFilename, fileType, filePath]
  );
  return result.insertId;
}

/**
 * Insert parsed resume data for a given resume_id.
 */
async function insertParsedData(resumeId, parsed) {
  const [result] = await pool.execute(
    `INSERT INTO resume_parsed_data
      (resume_id, full_name, email, phone, location, linkedin_url, github_url,
       summary, education_json, experience_json, projects_json,
       certifications_json, achievements_json, raw_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      resumeId,
      parsed.name          || null,
      parsed.email         || null,
      parsed.phone         || null,
      parsed.location      || null,
      parsed.linkedin      || null,
      parsed.github        || null,
      parsed.summary       || null,
      JSON.stringify(parsed.education      || []),
      JSON.stringify(parsed.experience     || []),
      JSON.stringify(parsed.projects       || []),
      JSON.stringify(parsed.certifications || []),
      JSON.stringify(parsed.achievements   || []),
      parsed.rawText       || null,
    ]
  );
  return result.insertId;
}

/**
 * Retrieve parsed data for a given resume_id.
 */
async function getParsedData(resumeId) {
  const [rows] = await pool.execute(
    'SELECT * FROM resume_parsed_data WHERE resume_id = ? ORDER BY parsed_at DESC LIMIT 1',
    [resumeId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  // Parse JSON columns
  ['education_json','experience_json','projects_json','certifications_json','achievements_json'].forEach(col => {
    if (typeof row[col] === 'string') {
      try { row[col] = JSON.parse(row[col]); } catch { row[col] = []; }
    }
  });
  return row;
}

/**
 * Get all resumes (optionally filtered by user_id).
 */
async function getAllResumes(userId = null) {
  if (userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC',
      [userId]
    );
    return rows;
  }
  const [rows] = await pool.execute('SELECT * FROM resumes ORDER BY uploaded_at DESC');
  return rows;
}

/**
 * Get a single resume row by ID.
 */
async function getResumeById(resumeId) {
  const [rows] = await pool.execute('SELECT * FROM resumes WHERE id = ?', [resumeId]);
  return rows[0] || null;
}

module.exports = { insertResume, insertParsedData, getParsedData, getAllResumes, getResumeById };
