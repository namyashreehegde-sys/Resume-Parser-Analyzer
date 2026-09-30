/**
 * server/ai/assistant/assistantService.js
 *
 * AI assistant for resume questions.
 * - Uses OpenAI when AI_PROVIDER=openai and OPENAI_API_KEY is set.
 * - Uses Gemini when AI_PROVIDER=gemini and GEMINI_API_KEY is set.
 * - Falls back to mock on any failure or when AI_PROVIDER=mock.
 *
 * API keys are NEVER sent to the frontend.
 */

const PROVIDER = (process.env.AI_PROVIDER || 'mock').toLowerCase();

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(context) {
  const { parsed, score, lastMatch } = context;

  const skillsList = Array.isArray(context.skills)
    ? context.skills.map(s => s.name).join(', ')
    : 'None detected';

  const missing = lastMatch?.missing_skills?.join(', ') || 'No job description analyzed yet';
  const suggestions = lastMatch?.suggestions?.join(' | ') || 'None';
  const topDimensions = score
    ? Object.entries(score.score_breakdown_json || {})
        .sort((a, b) => b[1].points - a[1].points)
        .slice(0, 3)
        .map(([k, v]) => `${k} (${v.points}/${v.max})`)
        .join(', ')
    : 'Not scored yet';

  return `You are a helpful resume advisor. Answer questions based ONLY on the following resume data. Do not invent or assume any information not present below.

CANDIDATE RESUME DATA:
Name: ${parsed?.name || 'Unknown'}
Email: ${parsed?.email || 'Not provided'}
Location: ${parsed?.location || 'Not provided'}
Summary: ${parsed?.summary || 'Not provided'}
Skills: ${skillsList}
Education entries: ${Array.isArray(parsed?.education) ? parsed.education.length : 0}
Experience entries: ${Array.isArray(parsed?.experience) ? parsed.experience.length : 0}
Projects: ${Array.isArray(parsed?.projects) ? parsed.projects.map(p => p.name).join(', ') : 'None'}
Certifications: ${Array.isArray(parsed?.certifications) ? parsed.certifications.join(', ') : 'None'}
Achievements: ${Array.isArray(parsed?.achievements) ? parsed.achievements.join(', ') : 'None'}

RESUME SCORE: ${score?.total_score ?? 'Not scored'} / 100
Top dimensions: ${topDimensions}

LAST JOB MATCH:
Missing skills: ${missing}
Suggestions: ${suggestions}

Answer the user's question helpfully and concisely. Base your answer only on the data above.`;
}

// ─── Mock adapter ─────────────────────────────────────────────────────────────

function mockResponse(message, context) {
  const lower = message.toLowerCase();
  const { skills, lastMatch, score, parsed } = context;

  const skillNames = Array.isArray(skills) ? skills.map(s => s.name) : [];
  const missing    = lastMatch?.missing_skills || [];
  const suggestions = lastMatch?.suggestions  || [];

  if (/missing|lack|don.t have|need/i.test(lower)) {
    if (missing.length === 0) {
      return 'No job description has been analyzed yet. Please run a job match first to see missing skills.';
    }
    return `Based on the job description you analyzed, you are missing: **${missing.join(', ')}**. Consider adding these to your resume or gaining experience in them.`;
  }

  if (/strong|best|good at|strength|top/i.test(lower)) {
    if (!score) return 'Your resume has not been scored yet. Please parse your resume first.';
    const breakdown = score.score_breakdown_json || {};
    const sorted = Object.entries(breakdown)
      .sort((a, b) => (b[1].points / b[1].max) - (a[1].points / a[1].max))
      .slice(0, 3)
      .map(([k, v]) => `${k} (${v.points}/${v.max})`);
    return `Your strongest areas are: **${sorted.join(', ')}**. ${skillNames.length > 0 ? `You have ${skillNames.length} skills listed including ${skillNames.slice(0, 5).join(', ')}.` : ''}`;
  }

  if (/improve|fix|better|enhance|update|add|suggestion/i.test(lower)) {
    if (suggestions.length > 0) return `Here are suggestions based on your last job match:\n• ${suggestions.join('\n• ')}`;
    const tips = [];
    if (!parsed?.summary)       tips.push('Add a professional summary.');
    if (!parsed?.linkedin)      tips.push('Include your LinkedIn profile URL.');
    if (!parsed?.github)        tips.push('Include your GitHub profile URL.');
    if (skillNames.length < 5)  tips.push('Add more technical skills to your Skills section.');
    if (!Array.isArray(parsed?.projects) || parsed.projects.length === 0) tips.push('Add at least one project with a description and technologies used.');
    if (tips.length === 0) return 'Your resume looks well-structured! Run a job description match to get tailored improvement suggestions.';
    return `Here are some general improvements:\n• ${tips.join('\n• ')}`;
  }

  if (/project|highlight|showcase|demonstrate/i.test(lower)) {
    const projects = parsed?.projects || [];
    if (projects.length === 0) return 'No projects were detected in your resume. Add projects with descriptions and technologies to strengthen your profile.';
    const projectList = projects.map(p => `**${p.name}**${p.description ? ': ' + p.description.slice(0, 80) + '…' : ''}`).join('\n• ');
    return `You have ${projects.length} project(s) in your resume:\n• ${projectList}\n\nHighlight the ones most relevant to the job you are applying for.`;
  }

  if (/keyword|important word|ats/i.test(lower)) {
    const keywords = lastMatch?.keywords || [];
    if (keywords.length === 0) return 'No job description has been analyzed yet. Paste a job description in the Job Match tab to extract important keywords.';
    return `Important keywords from the job description: **${keywords.slice(0, 15).join(', ')}**. Make sure these appear naturally in your resume.`;
  }

  if (/score|rating|percentage|how good/i.test(lower)) {
    if (!score) return 'Your resume has not been scored yet.';
    return `Your resume scored **${score.total_score}/100**. ${score.score_disclaimer}`;
  }

  if (/skill/i.test(lower)) {
    if (skillNames.length === 0) return 'No skills were detected in your resume. Make sure you have a Skills section with clearly listed technologies.';
    return `Your resume lists ${skillNames.length} skill(s): ${skillNames.join(', ')}.`;
  }

  return 'I can answer questions about your missing skills, resume strengths, improvement suggestions, projects, ATS keywords, and your resume score. Try asking one of those topics!';
}

// ─── OpenAI adapter ───────────────────────────────────────────────────────────

async function openAIResponse(message, history, systemPrompt) {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.message })),
    { role: 'user', content: message },
  ];

  const response = await client.chat.completions.create({
    model:       process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    messages,
    max_tokens:  500,
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}

// ─── Gemini adapter ───────────────────────────────────────────────────────────

async function geminiResponse(message, history, systemPrompt) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const historyContent = history.map(h => ({
    role:  h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.message }],
  }));

  const chat = model.startChat({
    history: [
      { role: 'user',  parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I will only answer based on the provided resume data.' }] },
      ...historyContent,
    ],
  });

  const result = await chat.sendMessage(message);
  return result.response.text().trim();
}

// ─── Main service ─────────────────────────────────────────────────────────────

/**
 * Handle one assistant chat turn.
 *
 * @param {string} message  — user's question
 * @param {Array}  history  — [{ role, message }] conversation history (last N turns)
 * @param {Object} context  — { parsed, skills, score, lastMatch }
 * @returns {Object}        — { reply, provider }
 */
async function chat(message, history, context) {
  const systemPrompt = buildSystemPrompt(context);

  // Try configured AI provider first
  if (PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
    try {
      const reply = await openAIResponse(message, history, systemPrompt);
      return { reply, provider: 'openai' };
    } catch (err) {
      console.error('[Assistant] OpenAI error, falling back to mock:', err.message);
    }
  }

  if (PROVIDER === 'gemini' && process.env.GEMINI_API_KEY) {
    try {
      const reply = await geminiResponse(message, history, systemPrompt);
      return { reply, provider: 'gemini' };
    } catch (err) {
      console.error('[Assistant] Gemini error, falling back to mock:', err.message);
    }
  }

  // Mock fallback
  const reply = mockResponse(message, context);
  return { reply, provider: 'mock' };
}

module.exports = { chat };
