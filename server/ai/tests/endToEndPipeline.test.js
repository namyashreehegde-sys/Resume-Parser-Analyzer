/**
 * server/ai/tests/endToEndPipeline.test.js
 * End-to-end test of the full AI pipeline without DB.
 */
const { extractSkills } = require('../extractor/skillExtractor');
const { scoreResume }   = require('../scorer/resumeScorer');
const { matchResume }   = require('../matcher/jobMatcher');
const { chat }          = require('../assistant/assistantService');

const PARSED = {
  name: 'John Developer',
  email: 'john@dev.com',
  phone: '+1-555-999-8888',
  location: 'Seattle, WA',
  linkedin: 'linkedin.com/in/johndeveloper',
  github: 'github.com/johndeveloper',
  summary: 'Full-stack developer with 4+ years building scalable web applications using React, Node.js, and AWS.',
  education: [{ institution: 'University of Washington', degree: 'B.Tech', field: 'Computer Science', startYear: '2015', endYear: '2019' }],
  experience: [
    { company: 'TechCorp Inc', title: 'Senior Software Engineer', startDate: 'Jan 2021', endDate: 'Present',
      description: 'Developed React applications and RESTful APIs using Node.js Express and MySQL database.' },
    { company: 'StartupXYZ', title: 'Software Engineer', startDate: 'Jun 2019', endDate: 'Dec 2020',
      description: 'Built Python Django backend with PostgreSQL. Used Docker and GitHub Actions for CI/CD.' },
  ],
  skills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'Django', 'MySQL', 'PostgreSQL', 'Docker', 'AWS', 'Git', 'HTML', 'CSS'],
  projects: [
    { name: 'E-Commerce Platform', description: 'React Node.js MySQL Stripe', technologies: ['React', 'Node.js', 'MySQL'] },
    { name: 'ML Dashboard',        description: 'Python TensorFlow React',    technologies: ['Python', 'TensorFlow', 'React'] },
    { name: 'Weather App',         description: 'React GraphQL API',          technologies: ['React', 'GraphQL'] },
  ],
  certifications: ['AWS Certified Solutions Architect', 'Google Cloud Professional Developer'],
  achievements: ['Led team of 5 engineers', 'Speaker at NodeConf 2022'],
  rawText: 'SUMMARY\nEDUCATION\nEXPERIENCE\nSKILLS\nPROJECTS',
};

const JD = 'We are looking for a Senior React developer with TypeScript, GraphQL, and Kubernetes experience. AWS and Docker knowledge required. Strong JavaScript and Node.js skills needed.';

describe('End-to-end AI pipeline', () => {
  let skills, score, matchResult;

  test('1. extractSkills returns categorized skills', () => {
    skills = extractSkills(PARSED);
    expect(skills.length).toBeGreaterThan(5);
    const categories = new Set(skills.map(s => s.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });

  test('2. scoreResume returns valid score', () => {
    skills = skills || extractSkills(PARSED);
    score = scoreResume(PARSED, skills);
    expect(score.total_score).toBeGreaterThan(60);
    expect(score.total_score).toBeLessThanOrEqual(100);
    expect(score.score_disclaimer).toBeTruthy();
    expect(Object.keys(score.score_breakdown_json).length).toBe(7);
  });

  test('3. matchResume returns valid match report', () => {
    skills = skills || extractSkills(PARSED);
    matchResult = matchResume(PARSED, skills, JD);
    expect(matchResult.match_percentage).toBeGreaterThan(0);
    expect(matchResult.matched_skills.length).toBeGreaterThan(0);
    expect(matchResult.missing_skills).toContain('Kubernetes');
    expect(Array.isArray(matchResult.suggestions)).toBe(true);
    expect(Array.isArray(matchResult.keywords)).toBe(true);
  });

  test('4. AI assistant (mock) answers missing skills question', async () => {
    skills = skills || extractSkills(PARSED);
    score  = score  || scoreResume(PARSED, skills);
    matchResult = matchResult || matchResume(PARSED, skills, JD);

    const context = {
      parsed:    PARSED,
      skills,
      score,
      lastMatch: {
        missing_skills: matchResult.missing_skills,
        suggestions:    matchResult.suggestions,
        keywords:       matchResult.keywords,
      },
    };
    const { reply, provider } = await chat('What skills am I missing?', [], context);
    expect(typeof reply).toBe('string');
    expect(reply.length).toBeGreaterThan(10);
    expect(provider).toBe('mock');
    expect(reply).toMatch(/Kubernetes|TypeScript|GraphQL/i);
  });

  test('5. Complete pipeline: score > match > suggestion chain is consistent', () => {
    skills = skills || extractSkills(PARSED);
    score  = score  || scoreResume(PARSED, skills);
    matchResult = matchResult || matchResume(PARSED, skills, JD);

    // Matched skills should be subset of resume skills
    const resumeSkillNames = new Set(skills.map(s => s.name.toLowerCase()));
    for (const m of matchResult.matched_skills) {
      expect(resumeSkillNames.has(m.toLowerCase())).toBe(true);
    }

    // Missing + matched should equal total JD skills
    const totalJDSkills = matchResult.matched_skills.length + matchResult.missing_skills.length;
    expect(totalJDSkills).toBe(matchResult.jd_skill_count);
  });

  test('6. Error handling: parse failure throws structured error', async () => {
    const { extractPdfText } = require('../parser/pdfParser');
    await expect(extractPdfText(Buffer.alloc(10))).rejects.toMatchObject({ code: 'PARSE_FAILURE' });
  });
});
