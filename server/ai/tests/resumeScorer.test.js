/**
 * server/ai/tests/resumeScorer.test.js
 * Unit tests for the resume scoring engine.
 */
const { scoreResume } = require('../scorer/resumeScorer');

const FULL_PARSED = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1-555-000-0000',
  location: 'NYC',
  linkedin: 'linkedin.com/in/jane',
  github: 'github.com/jane',
  summary: 'Experienced developer with 3 years building React and Node.js applications.',
  education: [{ institution: 'MIT', degree: 'B.Tech', field: 'CS', startYear: '2016', endYear: '2020' }],
  experience: [
    { company: 'Acme', title: 'Engineer', startDate: 'Jan 2021', endDate: 'Present', description: '...' },
    { company: 'Beta', title: 'Intern',   startDate: 'Jun 2020', endDate: 'Dec 2020', description: '...' },
  ],
  projects: [
    { name: 'Project A', description: 'Built with React', technologies: ['React'] },
    { name: 'Project B', description: 'Node.js API',      technologies: ['Node.js'] },
    { name: 'Project C', description: 'ML model',         technologies: ['Python'] },
  ],
  certifications: ['AWS Certified'],
  achievements: ['Won hackathon 2023'],
  rawText: 'SUMMARY\nEDUCATION\nEXPERIENCE\nSKILLS\nPROJECTS',
};

const FULL_SKILLS = [
  { name: 'React',      category: 'framework' },
  { name: 'Node.js',    category: 'framework' },
  { name: 'MySQL',      category: 'database' },
  { name: 'Python',     category: 'programming_language' },
  { name: 'Git',        category: 'tool' },
  { name: 'Docker',     category: 'tool' },
  { name: 'AWS',        category: 'cloud_devops' },
  { name: 'JavaScript', category: 'programming_language' },
  { name: 'TypeScript', category: 'programming_language' },
  { name: 'HTML',       category: 'web_technology' },
];

const EMPTY_PARSED = {
  name: null, email: null, phone: null, location: null,
  linkedin: null, github: null, summary: null,
  education: [], experience: [], skills: [], projects: [],
  certifications: [], achievements: [], rawText: '',
};

describe('resumeScorer', () => {
  test('full resume scores ≥ 70', () => {
    const score = scoreResume(FULL_PARSED, FULL_SKILLS);
    expect(score.total_score).toBeGreaterThanOrEqual(70);
  });

  test('empty resume scores < 20', () => {
    const score = scoreResume(EMPTY_PARSED, []);
    expect(score.total_score).toBeLessThan(20);
  });

  test('total score does not exceed 100', () => {
    const score = scoreResume(FULL_PARSED, FULL_SKILLS);
    expect(score.total_score).toBeLessThanOrEqual(100);
  });

  test('total score is non-negative', () => {
    const score = scoreResume(EMPTY_PARSED, []);
    expect(score.total_score).toBeGreaterThanOrEqual(0);
  });

  test('score_disclaimer is always present', () => {
    const score = scoreResume(FULL_PARSED, FULL_SKILLS);
    expect(score.score_disclaimer).toBeTruthy();
    expect(typeof score.score_disclaimer).toBe('string');
  });

  test('score_breakdown_json has all 7 dimensions', () => {
    const score = scoreResume(FULL_PARSED, FULL_SKILLS);
    const keys = Object.keys(score.score_breakdown_json);
    expect(keys).toContain('completeness');
    expect(keys).toContain('skills');
    expect(keys).toContain('education');
    expect(keys).toContain('experience');
    expect(keys).toContain('projects');
    expect(keys).toContain('contact');
    expect(keys).toContain('ats');
  });

  test('contact score increases with more contact fields', () => {
    const withContact = scoreResume(FULL_PARSED, []);
    const noContact   = scoreResume({ ...FULL_PARSED, email: null, phone: null, linkedin: null, github: null }, []);
    expect(withContact.contact_score).toBeGreaterThan(noContact.contact_score);
  });

  test('projects score increases with more projects', () => {
    const noProjects  = scoreResume({ ...FULL_PARSED, projects: [] }, []);
    const oneProject  = scoreResume({ ...FULL_PARSED, projects: [{ name: 'P', description: '', technologies: [] }] }, []);
    expect(oneProject.projects_score).toBeGreaterThan(noProjects.projects_score);
  });
});
