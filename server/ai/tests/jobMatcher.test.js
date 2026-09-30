/**
 * server/ai/tests/jobMatcher.test.js
 * Unit tests for job-description matching.
 */
const { matchResume } = require('../matcher/jobMatcher');

const RESUME_PARSED = {
  summary: 'React developer',
  experience: [{ description: 'Built React apps', startDate: 'Jan 2022', endDate: 'Present' }],
  projects: [{ name: 'P', description: 'React project', technologies: ['React'] }],
  linkedin: 'linkedin.com/in/test',
  github: null,
};

const RESUME_SKILLS = [
  { name: 'React',      category: 'framework' },
  { name: 'JavaScript', category: 'programming_language' },
  { name: 'HTML',       category: 'web_technology' },
  { name: 'CSS',        category: 'web_technology' },
  { name: 'Git',        category: 'tool' },
];

describe('jobMatcher', () => {
  test('returns match_percentage between 0 and 100', () => {
    const jd = 'We need a React JavaScript developer with experience in HTML CSS and Git.';
    const result = matchResume(RESUME_PARSED, RESUME_SKILLS, jd);
    expect(result.match_percentage).toBeGreaterThanOrEqual(0);
    expect(result.match_percentage).toBeLessThanOrEqual(100);
  });

  test('returns 100% when all JD skills are in resume', () => {
    const jd = 'We need React and JavaScript.';
    const result = matchResume(RESUME_PARSED, RESUME_SKILLS, jd);
    expect(result.match_percentage).toBe(100);
  });

  test('returns 0% when no JD skills match resume', () => {
    const jd = 'We need Rust and Haskell expertise.';
    const result = matchResume(RESUME_PARSED, RESUME_SKILLS, jd);
    expect(result.match_percentage).toBe(0);
  });

  test('matched_skills contains skills present in both resume and JD', () => {
    const jd = 'React developer with JavaScript and TypeScript skills.';
    const result = matchResume(RESUME_PARSED, RESUME_SKILLS, jd);
    expect(result.matched_skills).toContain('React');
    expect(result.matched_skills).toContain('JavaScript');
  });

  test('missing_skills contains skills in JD but not in resume', () => {
    const jd = 'React developer with TypeScript and GraphQL expertise.';
    const result = matchResume(RESUME_PARSED, RESUME_SKILLS, jd);
    expect(result.missing_skills).toContain('TypeScript');
  });

  test('returns keywords from JD', () => {
    const jd = 'We are looking for a skilled React developer with strong JavaScript experience.';
    const result = matchResume(RESUME_PARSED, RESUME_SKILLS, jd);
    expect(Array.isArray(result.keywords)).toBe(true);
  });

  test('returns suggestions array', () => {
    const jd = 'We need Python and Django experience.';
    const result = matchResume(RESUME_PARSED, RESUME_SKILLS, jd);
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  test('handles empty job description gracefully', () => {
    const result = matchResume(RESUME_PARSED, RESUME_SKILLS, '');
    expect(result.match_percentage).toBe(0);
    expect(result.matched_skills).toEqual([]);
    expect(result.missing_skills).toEqual([]);
  });
});
