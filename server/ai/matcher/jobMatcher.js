/**
 * server/ai/matcher/jobMatcher.js
 *
 * Matches a resume's extracted data against a job description.
 * Uses keyword-based matching (no external AI needed).
 *
 * Returns: match_percentage, matched_skills, missing_skills, keywords, suggestions
 */
const { lookupSkill, STOP_WORDS, KEYWORD_LOOKUP } = require('../constants/skillDictionary');

// ─── JD pre-processing ────────────────────────────────────────────────────────

/**
 * Tokenize JD text into individual tokens.
 */
function tokenizeJD(text) {
  return text
    .split(/[\s,|•·()[\]{}\n\r\t/\\;:"'!?<>]+/)
    .map(t => t.replace(/^[^a-zA-Z0-9#+.]+|[^a-zA-Z0-9#+.]+$/g, '').trim())
    .filter(t => t.length > 1);
}

/**
 * Extract compound skill names from JD text.
 */
function extractCompoundFromJD(text) {
  const lowerText = text.toLowerCase();
  const matches = [];
  for (const key of Object.keys(KEYWORD_LOOKUP)) {
    if (/[\s.]/.test(key)) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i');
      if (re.test(lowerText)) matches.push(key);
    }
  }
  return matches;
}

/**
 * Extract required skills from a job description.
 * Returns an array of { name, category }.
 */
function extractJDSkills(jdText) {
  const tokens = tokenizeJD(jdText);
  const compounds = extractCompoundFromJD(jdText);
  const found = new Map();

  // Compound skills first
  for (const t of compounds) {
    const entry = lookupSkill(t);
    if (entry) found.set(entry.name.toLowerCase(), entry);
  }
  // Single tokens
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (found.has(key)) continue;
    const entry = lookupSkill(t);
    if (entry) found.set(entry.name.toLowerCase(), entry);
  }
  return Array.from(found.values());
}

/**
 * Extract top keywords from a JD (non-stop-word tokens, sorted by frequency).
 */
function extractJDKeywords(jdText, limit = 20) {
  const tokens = tokenizeJD(jdText);
  const freq = {};
  for (const t of tokens) {
    if (t.length < 2) continue;
    const lower = t.toLowerCase();
    if (STOP_WORDS.has(lower)) continue;
    freq[lower] = (freq[lower] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

// ─── Suggestion generator ─────────────────────────────────────────────────────

function generateSuggestions(missingSkills, resumeParsed, matchPct) {
  const suggestions = [];

  if (missingSkills.length > 0) {
    const top3 = missingSkills.slice(0, 3).map(s => s.name).join(', ');
    suggestions.push(`Add the following skills to your Skills section: ${top3}.`);
  }

  if (matchPct < 50) {
    const names = missingSkills.slice(0, 3).map(s => s.name).join(', ');
    suggestions.push(
      `Your profile matches less than 50% of the job requirements. Consider gaining experience in: ${names || 'the required technologies'}.`
    );
  }

  const experienceCount = Array.isArray(resumeParsed.experience) ? resumeParsed.experience.length : 0;
  if (experienceCount < 2) {
    suggestions.push('Adding more work experience or internship entries would strengthen your profile.');
  }

  const projectCount = Array.isArray(resumeParsed.projects) ? resumeParsed.projects.length : 0;
  if (projectCount === 0 && missingSkills.length > 0) {
    suggestions.push(
      `Adding a project demonstrating ${missingSkills[0].name} could improve your match for this role.`
    );
  }

  if (!resumeParsed.summary) {
    suggestions.push('Adding a professional summary tailored to this role would improve your application.');
  }

  if (!resumeParsed.linkedin) {
    suggestions.push('Include your LinkedIn profile URL to increase recruiter confidence.');
  }

  return suggestions;
}

// ─── Main matcher ─────────────────────────────────────────────────────────────

/**
 * Match a resume against a job description.
 *
 * @param {Object} resumeParsed — output from parseResume()
 * @param {Array}  resumeSkills — output from extractSkills()
 * @param {string} jdText       — raw job description text
 * @returns {Object}            — match report matching the job_matches schema
 */
function matchResume(resumeParsed, resumeSkills, jdText) {
  const jdSkills    = extractJDSkills(jdText);
  const jdKeywords  = extractJDKeywords(jdText);

  const resumeSkillNames = new Set(
    (resumeSkills || []).map(s => s.name.toLowerCase())
  );

  const matched = jdSkills.filter(s => resumeSkillNames.has(s.name.toLowerCase()));
  const missing = jdSkills.filter(s => !resumeSkillNames.has(s.name.toLowerCase()));

  const matchPct = jdSkills.length > 0
    ? Math.round((matched.length / jdSkills.length) * 1000) / 10
    : 0;

  const suggestions = generateSuggestions(missing, resumeParsed, matchPct);

  return {
    match_percentage: matchPct,
    matched_skills:   matched.map(s => s.name),
    missing_skills:   missing.map(s => s.name),
    keywords:         jdKeywords,
    suggestions,
    jd_skill_count:   jdSkills.length,
  };
}

module.exports = { matchResume, extractJDSkills, extractJDKeywords };
