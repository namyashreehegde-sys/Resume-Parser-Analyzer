/**
 * server/ai/routes/analysisRoutes.js
 *
 * All AI/analysis REST endpoints.
 * Mounted by server/ai/index.js at /api/ai
 */
const express  = require('express');
const multer   = require('multer');
const { v4: uuidv4 } = require('uuid');
const path     = require('path');
const fs       = require('fs');

const { validateFile }  = require('../utils/fileValidator');
const { aiError }       = require('../utils/errorHandler');
const { parseResume }   = require('../parser/resumeParser');
const { extractSkills } = require('../extractor/skillExtractor');
const { scoreResume }   = require('../scorer/resumeScorer');
const { matchResume }   = require('../matcher/jobMatcher');
const { chat }          = require('../assistant/assistantService');

const resumeQ    = require('../db/resumeQueries');
const skillQ     = require('../db/skillQueries');
const scoreQ     = require('../db/scoreQueries');
const matchQ     = require('../db/matchQueries');
const assistantQ = require('../db/assistantQueries');

const router = express.Router();

// ── Multer: store file in memory buffer (max 5 MB) ──────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx') cb(null, true);
    else cb(new Error('UNSUPPORTED_FORMAT'));
  },
});

// Ensure uploads directory exists for persisting files on disk
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Helper: save buffer to disk under UUID name ─────────────────────────────
function saveFileToDisk(buffer, ext) {
  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return path.join('uploads', filename); // relative path stored in DB
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/ai/parse
// Upload + parse + score in one call
// ────────────────────────────────────────────────────────────────────────────
router.post('/parse', upload.single('resume'), async (req, res, next) => {
  try {
    // Multer file filter already rejected non-PDF/DOCX, but double-check
    if (!req.file) {
      return next(aiError('INVALID_FILE'));
    }

    const { valid, fileType, error: validErr } = await validateFile(req.file);
    if (!valid) {
      return next(aiError('UNSUPPORTED_FORMAT', validErr));
    }

    // Save to disk
    const ext      = path.extname(req.file.originalname).toLowerCase();
    const filePath = saveFileToDisk(req.file.buffer, ext);

    // Parse resume
    let parsed;
    try {
      parsed = await parseResume(req.file.buffer, fileType);
    } catch (parseErr) {
      return next(aiError(parseErr.code || 'PARSE_FAILURE', parseErr.message));
    }

    // Extract skills
    const skills = extractSkills(parsed);

    // Score
    const score = scoreResume(parsed, skills);

    // Persist to DB
    const resumeId = await resumeQ.insertResume(
      req.file.originalname,
      fileType,
      filePath,
      req.body.user_id ? parseInt(req.body.user_id) : null
    );
    await resumeQ.insertParsedData(resumeId, parsed);
    await skillQ.insertSkills(resumeId, skills);
    await scoreQ.insertScore(resumeId, score);

    // Remove rawText from response to keep payload clean
    const { rawText, ...parsedClean } = parsed;

    return res.status(200).json({
      resume_id: resumeId,
      parsed:    parsedClean,
      skills,
      score,
      warnings:  parsed.warnings || [],
      message:   'Resume parsed and analyzed successfully.',
    });
  } catch (err) {
    return next(err);
  }
});

// Handle multer file size error
router.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return next(aiError('FILE_TOO_LARGE'));
  }
  if (err && err.message === 'UNSUPPORTED_FORMAT') {
    return next(aiError('UNSUPPORTED_FORMAT'));
  }
  next(err);
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/ai/resume/:resumeId
// Retrieve stored analysis for a resume
// ────────────────────────────────────────────────────────────────────────────
router.get('/resume/:resumeId', async (req, res, next) => {
  try {
    const resumeId = parseInt(req.params.resumeId);
    if (!resumeId || resumeId < 1) return next(aiError('VALIDATION_ERROR'));

    const resume = await resumeQ.getResumeById(resumeId);
    if (!resume) return next(aiError('RESUME_NOT_FOUND'));

    const parsed = await resumeQ.getParsedData(resumeId);
    const skills = await skillQ.getSkills(resumeId);
    const score  = await scoreQ.getLatestScore(resumeId);

    // Map DB column names to clean field names for frontend
    const parsedClean = parsed ? {
      name:            parsed.full_name,
      email:           parsed.email,
      phone:           parsed.phone,
      location:        parsed.location,
      linkedin:        parsed.linkedin_url,
      github:          parsed.github_url,
      summary:         parsed.summary,
      education:       parsed.education_json     || [],
      experience:      parsed.experience_json    || [],
      projects:        parsed.projects_json      || [],
      certifications:  parsed.certifications_json || [],
      achievements:    parsed.achievements_json  || [],
    } : null;

    return res.json({ resume_id: resumeId, parsed: parsedClean, skills, score });
  } catch (err) {
    return next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/ai/match
// Match resume against a job description
// ────────────────────────────────────────────────────────────────────────────
router.post('/match', async (req, res, next) => {
  try {
    const { resume_id, job_title, job_description } = req.body;

    if (!resume_id || !job_description) {
      return next(aiError('VALIDATION_ERROR', 'resume_id and job_description are required.'));
    }
    if (typeof job_description !== 'string' || job_description.trim().length === 0) {
      return next(aiError('VALIDATION_ERROR', 'job_description must be a non-empty string.'));
    }
    if (job_description.length > 20000) {
      return next(aiError('VALIDATION_ERROR', 'job_description exceeds 20 000 character limit.'));
    }

    const resumeId = parseInt(resume_id);
    const resume   = await resumeQ.getResumeById(resumeId);
    if (!resume) return next(aiError('RESUME_NOT_FOUND'));

    const parsed = await resumeQ.getParsedData(resumeId);
    const skills = await skillQ.getSkills(resumeId);

    // Re-map DB columns to parsed shape for matcher
    const parsedForMatcher = parsed ? {
      summary:    parsed.summary,
      experience: parsed.experience_json  || [],
      projects:   parsed.projects_json    || [],
      linkedin:   parsed.linkedin_url,
      github:     parsed.github_url,
    } : {};

    const skillsForMatcher = (skills || []).map(s => ({ name: s.skill_name, category: s.category }));

    const matchResult = matchResume(parsedForMatcher, skillsForMatcher, job_description.trim());

    // Persist
    const matchId = await matchQ.insertMatch(
      resumeId,
      job_title || null,
      job_description.trim(),
      matchResult
    );

    return res.status(200).json({
      match_id:        matchId,
      resume_id:       resumeId,
      job_title:       job_title || null,
      match_percentage: matchResult.match_percentage,
      matched_skills:  matchResult.matched_skills,
      missing_skills:  matchResult.missing_skills,
      keywords:        matchResult.keywords,
      suggestions:     matchResult.suggestions,
      jd_skill_count:  matchResult.jd_skill_count,
    });
  } catch (err) {
    return next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/ai/matches/:resumeId
// Get all job matches for a resume
// ────────────────────────────────────────────────────────────────────────────
router.get('/matches/:resumeId', async (req, res, next) => {
  try {
    const resumeId = parseInt(req.params.resumeId);
    if (!resumeId || resumeId < 1) return next(aiError('VALIDATION_ERROR'));

    const resume = await resumeQ.getResumeById(resumeId);
    if (!resume) return next(aiError('RESUME_NOT_FOUND'));

    const matches = await matchQ.getMatches(resumeId);
    return res.json({ resume_id: resumeId, matches });
  } catch (err) {
    return next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/ai/assistant
// AI assistant chat
// ────────────────────────────────────────────────────────────────────────────
router.post('/assistant', async (req, res, next) => {
  try {
    const { resume_id, message } = req.body;

    if (!resume_id || !message) {
      return next(aiError('VALIDATION_ERROR', 'resume_id and message are required.'));
    }
    if (typeof message !== 'string' || message.trim().length === 0) {
      return next(aiError('VALIDATION_ERROR', 'message must be a non-empty string.'));
    }
    if (message.length > 2000) {
      return next(aiError('VALIDATION_ERROR', 'message exceeds 2 000 character limit.'));
    }

    const resumeId = parseInt(resume_id);
    const resume   = await resumeQ.getResumeById(resumeId);
    if (!resume) return next(aiError('RESUME_NOT_FOUND'));

    // Load context from DB
    const parsedRow = await resumeQ.getParsedData(resumeId);
    const skillRows = await skillQ.getSkills(resumeId);
    const score     = await scoreQ.getLatestScore(resumeId);
    const matches   = await matchQ.getMatches(resumeId);
    const history   = await assistantQ.getConversation(resumeId, 10);

    const parsed = parsedRow ? {
      name:           parsedRow.full_name,
      email:          parsedRow.email,
      location:       parsedRow.location,
      summary:        parsedRow.summary,
      linkedin:       parsedRow.linkedin_url,
      github:         parsedRow.github_url,
      experience:     parsedRow.experience_json  || [],
      projects:       parsedRow.projects_json    || [],
      certifications: parsedRow.certifications_json || [],
      achievements:   parsedRow.achievements_json || [],
    } : {};

    const skills    = (skillRows || []).map(s => ({ name: s.skill_name, category: s.category }));
    const lastMatch = matches && matches.length > 0 ? {
      missing_skills: matches[0].missing_skills_json || [],
      suggestions:    matches[0].suggestions_json    || [],
      keywords:       matches[0].keywords_json       || [],
    } : null;

    const context = { parsed, skills, score, lastMatch };

    // Save user message
    await assistantQ.insertMessage(resumeId, 'user', message.trim());

    // Get AI reply
    const { reply, provider } = await chat(message.trim(), history, context);

    // Save assistant reply
    await assistantQ.insertMessage(resumeId, 'assistant', reply);

    return res.json({ reply, provider });
  } catch (err) {
    return next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/ai/history/:resumeId
// Analysis history: all scores + matches for a resume
// ────────────────────────────────────────────────────────────────────────────
router.get('/history/:resumeId', async (req, res, next) => {
  try {
    const resumeId = parseInt(req.params.resumeId);
    if (!resumeId || resumeId < 1) return next(aiError('VALIDATION_ERROR'));

    const resume = await resumeQ.getResumeById(resumeId);
    if (!resume) return next(aiError('RESUME_NOT_FOUND'));

    const scores  = await scoreQ.getScoreHistory(resumeId);
    const matches = await matchQ.getMatches(resumeId);

    return res.json({ resume_id: resumeId, scores, matches });
  } catch (err) {
    return next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/ai/resumes
// List all resumes
// ────────────────────────────────────────────────────────────────────────────
router.get('/resumes', async (req, res, next) => {
  try {
    const userId  = req.query.user_id ? parseInt(req.query.user_id) : null;
    const resumes = await resumeQ.getAllResumes(userId);
    return res.json({ resumes });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
