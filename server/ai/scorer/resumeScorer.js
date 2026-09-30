/**
 * server/ai/scorer/resumeScorer.js
 *
 * Calculates a transparent 0–100 resume score across 7 weighted dimensions.
 *
 * IMPORTANT DISCLAIMER:
 * This score is an approximate project analysis metric.
 * It does NOT guarantee ATS success or hiring outcomes.
 */

const SCORE_DISCLAIMER =
  'This score is an approximate project analysis metric and does not guarantee ATS success or hiring outcomes.';

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function scoreCompleteness(parsed) {
  const fields = [
    'name', 'email', 'phone', 'location', 'linkedin', 'github', 'summary',
  ];
  const arrayFields = [
    'education', 'experience', 'skills', 'projects', 'certifications', 'achievements',
  ];

  let filled = 0;
  for (const f of fields) {
    if (parsed[f] && String(parsed[f]).trim()) filled++;
  }
  for (const f of arrayFields) {
    if (Array.isArray(parsed[f]) && parsed[f].length > 0) filled++;
  }
  // 13 total fields
  const raw = filled;
  const max = 13;
  const points = (raw / max) * 20;
  return { raw, max, points: Math.min(20, Math.round(points * 10) / 10) };
}

function scoreSkills(skills) {
  const count = Array.isArray(skills) ? skills.length : 0;
  let points;
  if      (count >= 15) points = 22;
  else if (count >= 10) points = 18;
  else if (count >= 5)  points = 10;
  else                  points = (count / 5) * 10;

  // Bonus for breadth (≥ 3 different categories)
  if (Array.isArray(skills)) {
    const categories = new Set(skills.map(s => s.category).filter(Boolean));
    if (categories.size >= 3) points = Math.min(25, points + 3);
  }

  return { raw: count, max: 25, points: Math.min(25, Math.round(points * 10) / 10) };
}

function scoreEducation(education) {
  const entries = Array.isArray(education) ? education : [];
  let points = 0;

  if (entries.length === 0) {
    points = 0;
  } else if (entries.length >= 2) {
    points = 15;
  } else {
    const e = entries[0];
    const hasDegree      = Boolean(e.degree);
    const hasInstitution = Boolean(e.institution);
    const hasYears       = Boolean(e.startYear || e.endYear);
    if (hasDegree && hasInstitution && hasYears) points = 12;
    else if (hasDegree) points = 8;
    else points = 4;
  }

  return { raw: entries.length, max: 15, points };
}

function scoreExperience(experience) {
  const entries = Array.isArray(experience) ? experience : [];
  let points;

  if      (entries.length >= 3) points = 17;
  else if (entries.length === 2) points = 13;
  else if (entries.length === 1) points = 8;
  else points = 0;

  // Bonus for dated entries
  const datedCount = entries.filter(e => e.startDate && e.endDate).length;
  if (datedCount > 0 && datedCount === entries.length) points = Math.min(20, points + 3);

  return { raw: entries.length, max: 20, points };
}

function scoreProjects(projects) {
  const entries = Array.isArray(projects) ? projects : [];
  let points;

  if      (entries.length >= 3) points = 10;
  else if (entries.length === 2) points = 7;
  else if (entries.length === 1) points = 4;
  else points = 0;

  return { raw: entries.length, max: 10, points };
}

function scoreContact(parsed) {
  let points = 0;
  if (parsed.email)    points += 2;
  if (parsed.phone)    points += 1;
  if (parsed.linkedin) points += 1;
  if (parsed.github)   points += 1;
  return { raw: points, max: 5, points };
}

function scoreATS(parsed, rawText) {
  let points = 0;
  const text = rawText || '';

  // Standard section headers present
  const standardHeaders = ['summary','education','experience','skills','projects'];
  const headerCount = standardHeaders.filter(h =>
    new RegExp(`\\b${h}\\b`, 'i').test(text)
  ).length;
  if (headerCount >= 4) points += 3;
  else if (headerCount >= 2) points += 1;

  // No heavy pipe-table formatting
  const pipeLines = text.split('\n').filter(l => (l.match(/\|/g) || []).length > 3);
  if (pipeLines.length === 0) points += 1;

  // Summary/objective present
  if (parsed.summary && parsed.summary.length > 20) points += 1;

  return { raw: points, max: 5, points: Math.min(5, points) };
}

// ─── Main scorer ──────────────────────────────────────────────────────────────

/**
 * Score a resume.
 *
 * @param {Object} parsed  — output from parseResume()
 * @param {Array}  skills  — output from extractSkills()
 * @returns {Object}       — score record matching the resume_scores schema
 */
function scoreResume(parsed, skills) {
  const completeness = scoreCompleteness(parsed);
  const skillsScore  = scoreSkills(skills);
  const education    = scoreEducation(parsed.education);
  const experience   = scoreExperience(parsed.experience);
  const projects     = scoreProjects(parsed.projects);
  const contact      = scoreContact(parsed);
  const ats          = scoreATS(parsed, parsed.rawText);

  const total = Math.min(100,
    completeness.points +
    skillsScore.points  +
    education.points    +
    experience.points   +
    projects.points     +
    contact.points      +
    ats.points
  );

  return {
    total_score:        Math.round(total * 10) / 10,
    completeness_score: completeness.points,
    skills_score:       skillsScore.points,
    education_score:    education.points,
    experience_score:   experience.points,
    projects_score:     projects.points,
    contact_score:      contact.points,
    ats_score:          ats.points,
    score_breakdown_json: {
      completeness: { raw: completeness.raw, max: completeness.max, weight: '20%', points: completeness.points },
      skills:       { raw: skillsScore.raw,  max: skillsScore.max,  weight: '25%', points: skillsScore.points },
      education:    { raw: education.raw,    max: education.max,    weight: '15%', points: education.points },
      experience:   { raw: experience.raw,   max: experience.max,   weight: '20%', points: experience.points },
      projects:     { raw: projects.raw,     max: projects.max,     weight: '10%', points: projects.points },
      contact:      { raw: contact.raw,      max: contact.max,      weight: '5%',  points: contact.points },
      ats:          { raw: ats.raw,          max: ats.max,          weight: '5%',  points: ats.points },
    },
    score_disclaimer: SCORE_DISCLAIMER,
  };
}

module.exports = { scoreResume, SCORE_DISCLAIMER };
