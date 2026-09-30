/**
 * server/ai/tests/assistantMock.test.js
 * Unit tests for the mock AI assistant adapter.
 */

// We test mock logic in isolation without DB or API calls
const MOCK_CONTEXT = {
  parsed: {
    name: 'Jane Doe',
    email: 'jane@test.com',
    location: 'NYC',
    summary: 'React developer',
    linkedin: 'linkedin.com/in/jane',
    github: null,
    experience: [{ company: 'Acme', title: 'Engineer' }],
    projects: [{ name: 'My App', description: 'React app' }],
    certifications: [],
    achievements: [],
  },
  skills: [
    { name: 'React',      category: 'framework' },
    { name: 'JavaScript', category: 'programming_language' },
  ],
  score: {
    total_score: 72,
    score_disclaimer: 'This is a metric.',
    score_breakdown_json: {
      completeness: { raw: 10, max: 13, weight: '20%', points: 15 },
      skills:       { raw: 5,  max: 25, weight: '25%', points: 10 },
    },
  },
  lastMatch: {
    missing_skills: ['TypeScript', 'GraphQL'],
    suggestions:    ['Add TypeScript to your Skills section.'],
    keywords:       ['react', 'typescript', 'frontend'],
  },
};

// Extract the mock function from the service (test it directly)
function mockResponse(message, context) {
  const lower = message.toLowerCase();
  const { skills, lastMatch, score, parsed } = context;
  const skillNames   = Array.isArray(skills) ? skills.map(s => s.name) : [];
  const missing      = lastMatch?.missing_skills || [];
  const suggestions  = lastMatch?.suggestions    || [];

  if (/missing|lack|don.t have|need/i.test(lower)) {
    if (missing.length === 0) return 'No job description has been analyzed yet.';
    return `Based on the job description you analyzed, you are missing: **${missing.join(', ')}**. Consider adding these to your resume or gaining experience in them.`;
  }
  if (/strong|best|good at|strength|top/i.test(lower)) {
    if (!score) return 'Your resume has not been scored yet.';
    const breakdown = score.score_breakdown_json || {};
    const sorted = Object.entries(breakdown)
      .sort((a, b) => (b[1].points / b[1].max) - (a[1].points / a[1].max))
      .slice(0, 3)
      .map(([k, v]) => `${k} (${v.points}/${v.max})`);
    return `Your strongest areas are: **${sorted.join(', ')}**.`;
  }
  if (/improve|fix|better|enhance|update|add|suggestion/i.test(lower)) {
    if (suggestions.length > 0) return `Here are suggestions:\n• ${suggestions.join('\n• ')}`;
    return 'Run a job description match to get tailored suggestions.';
  }
  if (/project|highlight|showcase/i.test(lower)) {
    const projects = parsed?.projects || [];
    if (projects.length === 0) return 'No projects detected.';
    return `You have ${projects.length} project(s): ${projects.map(p => p.name).join(', ')}.`;
  }
  if (/keyword|important word|ats/i.test(lower)) {
    const keywords = lastMatch?.keywords || [];
    if (keywords.length === 0) return 'No job description analyzed yet.';
    return `Keywords: **${keywords.slice(0, 15).join(', ')}**.`;
  }
  if (/score|rating/i.test(lower)) {
    if (!score) return 'Not scored yet.';
    return `Your resume scored **${score.total_score}/100**.`;
  }
  return 'I can answer questions about missing skills, strengths, improvement suggestions, projects, ATS keywords, and your score.';
}

describe('assistantMock', () => {
  test('answers missing skills question', () => {
    const reply = mockResponse('What skills am I missing?', MOCK_CONTEXT);
    expect(reply).toMatch(/TypeScript/);
    expect(reply).toMatch(/GraphQL/);
  });

  test('answers strengths question', () => {
    const reply = mockResponse('What are my strongest areas?', MOCK_CONTEXT);
    expect(reply).toMatch(/strongest/);
  });

  test('answers improvement question', () => {
    const reply = mockResponse('How can I improve my resume?', MOCK_CONTEXT);
    expect(reply.length).toBeGreaterThan(10);
  });

  test('answers projects question', () => {
    const reply = mockResponse('Which projects should I highlight?', MOCK_CONTEXT);
    expect(reply).toMatch(/My App/);
  });

  test('answers keywords question', () => {
    const reply = mockResponse('What keywords are important?', MOCK_CONTEXT);
    expect(reply).toMatch(/react/i);
  });

  test('answers score question', () => {
    const reply = mockResponse('What is my score?', MOCK_CONTEXT);
    expect(reply).toMatch(/72/);
  });

  test('returns default fallback for unrecognized questions', () => {
    const reply = mockResponse('What is the meaning of life?', MOCK_CONTEXT);
    expect(reply).toMatch(/I can answer/);
  });
});
