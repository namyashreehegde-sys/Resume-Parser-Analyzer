/**
 * server/ai/tests/skillExtractor.test.js
 * Unit tests for skill extraction and categorization.
 */
const { extractSkills } = require('../extractor/skillExtractor');

describe('skillExtractor', () => {
  test('extracts known skills from skills array', () => {
    const parsed = {
      skills: ['JavaScript', 'React', 'MySQL', 'Docker'],
      experience: [],
      projects: [],
      summary: '',
      certifications: [],
    };
    const result = extractSkills(parsed);
    const names = result.map(s => s.name);
    expect(names).toContain('JavaScript');
    expect(names).toContain('React');
    expect(names).toContain('MySQL');
    expect(names).toContain('Docker');
  });

  test('categorizes skills correctly', () => {
    const parsed = {
      skills: ['Python', 'React', 'MySQL', 'AWS', 'Git'],
      experience: [], projects: [], summary: '', certifications: [],
    };
    const result = extractSkills(parsed);
    const byName = Object.fromEntries(result.map(s => [s.name, s.category]));
    expect(byName['Python']).toBe('programming_language');
    expect(byName['React']).toBe('framework');
    expect(byName['MySQL']).toBe('database');
    expect(byName['AWS']).toBe('cloud_devops');
    expect(byName['Git']).toBe('tool');
  });

  test('is case-insensitive', () => {
    const parsed = {
      skills: ['javascript', 'REACT', 'MySql'],
      experience: [], projects: [], summary: '', certifications: [],
    };
    const result = extractSkills(parsed);
    const names = result.map(s => s.name);
    expect(names).toContain('JavaScript');
    expect(names).toContain('React');
    expect(names).toContain('MySQL');
  });

  test('deduplicates skills', () => {
    const parsed = {
      skills: ['React', 'React', 'JavaScript', 'JavaScript'],
      experience: [], projects: [], summary: '', certifications: [],
    };
    const result = extractSkills(parsed);
    const names = result.map(s => s.name);
    const reactCount = names.filter(n => n === 'React').length;
    expect(reactCount).toBe(1);
  });

  test('ignores unknown tokens', () => {
    const parsed = {
      skills: ['XyzFooBarBaz123', 'unknowntechnology'],
      experience: [], projects: [], summary: '', certifications: [],
    };
    const result = extractSkills(parsed);
    expect(result.length).toBe(0);
  });

  test('extracts skills from experience descriptions', () => {
    const parsed = {
      skills: [],
      experience: [{ description: 'Built applications using React and Node.js with MySQL database' }],
      projects: [], summary: '', certifications: [],
    };
    const result = extractSkills(parsed);
    const names = result.map(s => s.name);
    expect(names.some(n => n.toLowerCase() === 'react')).toBe(true);
  });
});
