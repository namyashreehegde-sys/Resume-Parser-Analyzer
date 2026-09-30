/**
 * server/ai/parser/resumeParser.js
 *
 * Orchestrates PDF/DOCX extraction and runs section-based field detection.
 * Returns a structured object with all 13 resume fields.
 * Missing fields are null / empty array — nothing is invented.
 */
const { extractPdfText }  = require('./pdfParser');
const { extractDocxText } = require('./docxParser');

// ─── Section header keywords ────────────────────────────────────────────────
const SECTION_HEADERS = {
  summary:          /^(summary|objective|professional\s+summary|career\s+objective|profile|about\s+me)\s*:?\s*$/i,
  education:        /^(education|academic\s+(background|qualifications?)|qualifications?)\s*:?\s*$/i,
  experience:       /^(experience|work\s+experience|professional\s+experience|employment(\s+history)?|internship(s)?|work\s+history)\s*:?\s*$/i,
  skills:           /^(skills?|technical\s+skills?|core\s+competenc(y|ies)|key\s+skills?|technologies|tech\s+stack)\s*:?\s*$/i,
  projects:         /^(projects?|personal\s+projects?|academic\s+projects?|key\s+projects?)\s*:?\s*$/i,
  certifications:   /^(certifications?|certificates?|licenses?\s*&?\s*certifications?)\s*:?\s*$/i,
  achievements:     /^(achievements?|awards?|honors?|accomplishments?|recognition)\s*:?\s*$/i,
};

const DEGREE_KEYWORDS = /\b(b\.?tech|b\.?e\.?|b\.?sc\.?|b\.?a\.?|m\.?tech|m\.?sc\.?|m\.?a\.?|mba|phd|ph\.?d\.?|bachelor|master|doctorate|associate|diploma|b\.?com|m\.?com)\b/i;
const YEAR_PATTERN    = /\b(19|20)\d{2}\b/;
const MONTH_YEAR      = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*'?\d{2,4}\b/i;

// ─── Regex extractors ────────────────────────────────────────────────────────
function extractEmail(text) {
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}

function extractPhone(text) {
  // Matches: +91-9876543210, (123) 456-7890, 9876543210, +1 800 555 0100, etc.
  const m = text.match(/(?:\+?\d{1,3}[\s\-.]?)?(?:\(?\d{2,4}\)?[\s\-.]?)?\d{3,5}[\s\-.]?\d{3,5}[\s\-.]?\d{0,5}/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 ? m[0].trim() : null;
}

function extractLinkedIn(text) {
  const m = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?/i);
  return m ? m[0] : null;
}

function extractGitHub(text) {
  const m = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9\-_%]+\/?/i);
  return m ? m[0] : null;
}

// Simple location heuristic: "City, State" or "City, Country" patterns in first 15 lines
function extractLocation(lines) {
  const top = lines.slice(0, 15);
  for (const line of top) {
    if (/^[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+$/.test(line.trim())) {
      // Exclude if it looks like a company or university name (contains Inc, University, etc.)
      if (!/\b(inc|ltd|university|college|institute|school)\b/i.test(line)) {
        return line.trim();
      }
    }
  }
  return null;
}

// Name heuristic: first non-empty line that isn't email/phone/URL/header
function extractName(lines) {
  const skipPatterns = [
    /^[a-zA-Z0-9._%+\-]+@/,        // email
    /^\+?\d[\d\s\-().]+$/,          // phone
    /^https?:\/\//i,                // URL
    /linkedin|github/i,             // social
    /resume|curriculum\s+vitae|cv/i,
    DEGREE_KEYWORDS,
  ];
  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (Object.values(SECTION_HEADERS).some(re => re.test(trimmed))) continue;
    if (skipPatterns.some(re => re.test(trimmed))) continue;
    if (trimmed.split(' ').length >= 2 && trimmed.split(' ').length <= 6 && /^[A-Za-z\s.\-']+$/.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

// ─── Section splitter ────────────────────────────────────────────────────────
function splitIntoSections(lines) {
  const sections = { header: [] };
  let current = 'header';

  for (const line of lines) {
    const trimmed = line.trim();
    let matched = false;
    for (const [sectionName, re] of Object.entries(SECTION_HEADERS)) {
      if (re.test(trimmed)) {
        current = sectionName;
        sections[sectionName] = sections[sectionName] || [];
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (!sections[current]) sections[current] = [];
      sections[current].push(line);
    }
  }
  return sections;
}

// ─── Education parser ────────────────────────────────────────────────────────
function parseEducation(lines) {
  const entries = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) { entries.push(current); current = null; }
      continue;
    }
    if (DEGREE_KEYWORDS.test(trimmed) || YEAR_PATTERN.test(trimmed)) {
      if (!current) current = { institution: null, degree: null, field: null, startYear: null, endYear: null };
      // Extract years
      const years = trimmed.match(/\b(19|20)\d{2}\b/g);
      if (years) {
        if (!current.startYear) current.startYear = years[0];
        if (years.length > 1 && !current.endYear) current.endYear = years[1];
        else if (years[0] && !current.endYear && /present|current|now/i.test(trimmed)) current.endYear = 'Present';
      }
      const degreeMatch = trimmed.match(DEGREE_KEYWORDS);
      if (degreeMatch && !current.degree) current.degree = degreeMatch[0];
      if (!current.institution) current.institution = trimmed.replace(/\b(19|20)\d{2}\b/g, '').replace(DEGREE_KEYWORDS, '').trim().replace(/^[,\-–\s]+|[,\-–\s]+$/g, '') || null;
    } else if (!current) {
      current = { institution: trimmed, degree: null, field: null, startYear: null, endYear: null };
    } else if (!current.institution) {
      current.institution = trimmed;
    }
  }
  if (current) entries.push(current);
  return entries.filter(e => e.institution || e.degree);
}

// ─── Experience parser ────────────────────────────────────────────────────────
function parseExperience(lines) {
  const entries = [];
  let current = null;
  const descBuf = [];

  const flush = () => {
    if (current) {
      current.description = descBuf.join(' ').trim();
      entries.push(current);
      current = null;
      descBuf.length = 0;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const hasDate = YEAR_PATTERN.test(trimmed) || MONTH_YEAR.test(trimmed);
    const hasDash = /[-–|]/.test(trimmed);

    if (hasDate && (hasDash || trimmed.split(/\s+/).length <= 8)) {
      // Looks like a new experience entry header
      flush();
      current = { company: null, title: null, startDate: null, endDate: null, description: '' };
      // Extract date range
      const dateMatch = trimmed.match(/((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s*'?\d{2,4}|(?:19|20)\d{2})\s*[-–to]+\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s*'?\d{2,4}|(?:19|20)\d{2}|present|current|now)/i);
      if (dateMatch) {
        current.startDate = dateMatch[1].trim();
        current.endDate   = dateMatch[2].trim();
      }
      const titlePart = trimmed.replace(/\(.*?\)/g, '').split(/[-–|]/)[0].trim();
      if (titlePart && !YEAR_PATTERN.test(titlePart)) {
        current.title = titlePart;
      }
    } else if (current && !current.company && !YEAR_PATTERN.test(trimmed)) {
      current.company = trimmed;
    } else if (current) {
      descBuf.push(trimmed);
    } else {
      // No current entry started yet
      current = { company: trimmed, title: null, startDate: null, endDate: null, description: '' };
    }
  }
  flush();
  return entries.filter(e => e.company || e.title);
}

// ─── Projects parser ────────────────────────────────────────────────────────
function parseProjects(lines) {
  const entries = [];
  let current = null;
  const descBuf = [];

  const flush = () => {
    if (current) {
      current.description = descBuf.join(' ').trim();
      entries.push(current);
      current = null;
      descBuf.length = 0;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { if (current) flush(); continue; }

    // A line with few words and no lowercase = likely project title
    if (!current || (trimmed.split(' ').length <= 6 && /^[A-Z]/.test(trimmed) && !/^https?:\/\//i.test(trimmed))) {
      flush();
      current = { name: trimmed, description: '', technologies: [] };
    } else {
      // Extract tech mentions
      const techTokens = trimmed.split(/[\s,|()[\]]+/).filter(t => t.length > 1);
      current.technologies.push(...techTokens);
      descBuf.push(trimmed);
    }
  }
  flush();
  return entries.filter(e => e.name);
}

// ─── Skills from skills section ───────────────────────────────────────────────
function parseSkills(lines) {
  const raw = lines.join(' ');
  return raw
    .split(/[,|•·\n\r\t]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 50);
}

// ─── Main parser ─────────────────────────────────────────────────────────────
async function parseResume(fileBuffer, fileType) {
  let rawText;

  if (fileType === 'pdf') {
    const result = await extractPdfText(fileBuffer);
    rawText = result.rawText;
  } else if (fileType === 'docx') {
    const result = await extractDocxText(fileBuffer);
    rawText = result.rawText;
  } else {
    const err = new Error('Unsupported file type. Only PDF and DOCX are supported.');
    err.code  = 'UNSUPPORTED_FORMAT';
    throw err;
  }

  const lines    = rawText.split(/\r?\n/);
  const sections = splitIntoSections(lines);

  const email    = extractEmail(rawText);
  const phone    = extractPhone(rawText);
  const linkedin = extractLinkedIn(rawText);
  const github   = extractGitHub(rawText);
  const name     = extractName(lines);
  const location = extractLocation(sections.header || lines);

  const summaryLines       = sections.summary        || [];
  const educationLines     = sections.education      || [];
  const experienceLines    = sections.experience     || [];
  const skillsLines        = sections.skills         || [];
  const projectsLines      = sections.projects       || [];
  const certLines          = sections.certifications || [];
  const achievementsLines  = sections.achievements   || [];

  const summary        = summaryLines.map(l => l.trim()).filter(Boolean).join(' ') || null;
  const education      = parseEducation(educationLines);
  const experience     = parseExperience(experienceLines);
  const skills         = parseSkills(skillsLines);
  const projects       = parseProjects(projectsLines);
  const certifications = certLines.map(l => l.trim()).filter(Boolean);
  const achievements   = achievementsLines.map(l => l.trim()).filter(l => l.length > 2);

  const warnings = [];
  if (!name)     warnings.push('name not detected');
  if (!email)    warnings.push('email not detected');
  if (!location) warnings.push('location not detected');

  return {
    name, email, phone, location, linkedin, github,
    summary,
    education,
    experience,
    skills,
    projects,
    certifications,
    achievements,
    rawText,
    warnings,
  };
}

module.exports = { parseResume };
