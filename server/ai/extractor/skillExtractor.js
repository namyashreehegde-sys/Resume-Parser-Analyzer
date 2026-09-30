/**
 * server/ai/extractor/skillExtractor.js
 *
 * Extracts and categorizes skills from parsed resume data.
 * Uses whole-word, case-insensitive matching against the skill dictionary.
 * Returns an array of { name, category } — deduplicated with canonical casing.
 */
const { lookupSkill } = require('../constants/skillDictionary');

/**
 * Tokenize a text string into individual words/tokens.
 */
function tokenize(text) {
  // Split on whitespace and common delimiters; keep compound tokens like "C++" together
  return text
    .split(/[\s,|•·()[\]{}\n\r\t/\\]+/)
    .map(t => t.replace(/^[^a-zA-Z0-9#+.]+|[^a-zA-Z0-9#+.]+$/g, ''))
    .filter(t => t.length > 0);
}

/**
 * Extract categorized skills from parsed resume data.
 *
 * @param {Object} parsed  — the output from parseResume()
 * @returns {Array}        — [{ name: string, category: string }]
 */
function extractSkills(parsed) {
  // Collect all text sources
  const textSources = [];

  // Skills section (highest priority)
  if (Array.isArray(parsed.skills)) {
    textSources.push(...parsed.skills);
  }

  // Experience descriptions
  if (Array.isArray(parsed.experience)) {
    for (const exp of parsed.experience) {
      if (exp.description) textSources.push(exp.description);
      if (exp.title)       textSources.push(exp.title);
    }
  }

  // Project descriptions and technologies
  if (Array.isArray(parsed.projects)) {
    for (const proj of parsed.projects) {
      if (proj.description) textSources.push(proj.description);
      if (Array.isArray(proj.technologies)) textSources.push(...proj.technologies);
    }
  }

  // Summary
  if (parsed.summary) textSources.push(parsed.summary);

  // Certifications (may contain technology names)
  if (Array.isArray(parsed.certifications)) textSources.push(...parsed.certifications);

  // Tokenize all sources
  const allTokens = [];
  for (const source of textSources) {
    allTokens.push(...tokenize(String(source)));
  }

  // Also try multi-word matches for known compound skills
  // e.g. "Next.js", "React Native", "GitHub Actions", "Spring Boot"
  const fullText = textSources.join(' ');
  const compoundTokens = extractCompoundSkills(fullText);

  // Build deduplicated result set (keyed by lowercased canonical name)
  const found = new Map();

  // Process compound first (higher precision)
  for (const token of compoundTokens) {
    const entry = lookupSkill(token);
    if (entry) found.set(entry.name.toLowerCase(), entry);
  }

  // Process individual tokens
  for (const token of allTokens) {
    if (found.has(token.toLowerCase())) continue;
    const entry = lookupSkill(token);
    if (entry) found.set(entry.name.toLowerCase(), entry);
  }

  return Array.from(found.values()).sort((a, b) =>
    a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );
}

/**
 * Extract multi-word skill names from a text block.
 * Checks each known skill name that contains spaces or dots.
 */
function extractCompoundSkills(text) {
  const { KEYWORD_LOOKUP } = require('../constants/skillDictionary');
  const lowerText = text.toLowerCase();
  const matches = [];

  for (const key of Object.keys(KEYWORD_LOOKUP)) {
    if (/[\s.]/.test(key)) {
      // Use word-boundary safe check
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i');
      if (re.test(lowerText)) matches.push(key);
    }
  }
  return matches;
}

module.exports = { extractSkills };
