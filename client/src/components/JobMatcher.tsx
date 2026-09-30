'use client';

import { useState } from 'react';
import { matchJob, extractErrorMessage } from '@/lib/api';
import type { MatchResponse, Skill } from '@/types/resume';

interface Props {
  resumeId: number;
  skills: Skill[];
}

export default function JobMatcher({ resumeId, skills }: Props) {
  const [jobTitle, setJobTitle]     = useState('');
  const [jdText, setJdText]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<MatchResponse | null>(null);

  async function handleMatch() {
    if (!jdText.trim()) { setError('Please paste a job description.'); return; }
    setError(null);
    setLoading(true);
    try {
      const data = await matchJob(resumeId, jdText.trim(), jobTitle.trim());
      setResult(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const pctColor = result
    ? result.match_percentage >= 70 ? 'text-green-600'
    : result.match_percentage >= 45 ? 'text-yellow-600'
    : 'text-red-500'
    : '';

  return (
    <div className="space-y-5">
      {/* Input */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Title (optional)</label>
          <input
            type="text"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            placeholder="e.g. Frontend Developer"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Description <span className="text-red-400">*</span></label>
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            rows={6}
            placeholder="Paste the full job description here…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
          />
          <p className="text-xs text-gray-400 mt-1">{jdText.length}/20000 characters</p>
        </div>
        <button
          onClick={handleMatch}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Analyzing…' : 'Analyze Match'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">⚠️ {error}</div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5 pt-2">
          {/* Match percentage */}
          <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
            <div className={`text-4xl font-bold ${pctColor}`}>{result.match_percentage}%</div>
            <div>
              <div className="font-medium text-gray-700">Match Score</div>
              <div className="text-xs text-gray-400">
                {result.matched_skills.length} of {result.jd_skill_count} required skills matched
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Matched skills */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">✅ Matched Skills</h3>
              {result.matched_skills.length === 0
                ? <p className="text-sm text-gray-400 italic">None</p>
                : (
                  <div className="flex flex-wrap gap-1">
                    {result.matched_skills.map(s => (
                      <span key={s} className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">{s}</span>
                    ))}
                  </div>
                )}
            </div>

            {/* Missing skills */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">❌ Missing Skills</h3>
              {result.missing_skills.length === 0
                ? <p className="text-sm text-gray-400 italic">None — great match!</p>
                : (
                  <div className="flex flex-wrap gap-1">
                    {result.missing_skills.map(s => (
                      <span key={s} className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs">{s}</span>
                    ))}
                  </div>
                )}
            </div>
          </div>

          {/* Keywords */}
          {result.keywords?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🔑 Key JD Keywords</h3>
              <div className="flex flex-wrap gap-1">
                {result.keywords.slice(0, 20).map(k => (
                  <span key={k} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs">{k}</span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">💡 Improvement Suggestions</h3>
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700 bg-yellow-50 rounded-lg px-3 py-2">
                    <span>→</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
