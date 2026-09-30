'use client';

import { useState, useEffect } from 'react';
import { getHistory, extractErrorMessage } from '@/lib/api';

interface Props {
  resumeId: number;
}

export default function HistoryPanel({ resumeId }: Props) {
  const [history, setHistory] = useState<{ scores: any[]; matches: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    getHistory(resumeId)
      .then(data => setHistory(data))
      .catch(err => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [resumeId]);

  if (loading) return <div className="text-sm text-gray-400 animate-pulse">Loading history…</div>;
  if (error)   return <div className="text-sm text-red-500">⚠️ {error}</div>;
  if (!history) return null;

  return (
    <div className="space-y-6">
      {/* Score history */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Score History</h3>
        {history.scores.length === 0
          ? <p className="text-sm text-gray-400 italic">No scores recorded yet.</p>
          : (
            <div className="space-y-2">
              {history.scores.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
                  <span className="text-gray-600">{new Date(s.scored_at).toLocaleString()}</span>
                  <span className={`font-semibold ${s.total_score >= 65 ? 'text-green-600' : s.total_score >= 45 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {s.total_score}/100
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Match history */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Job Match History</h3>
        {history.matches.length === 0
          ? <p className="text-sm text-gray-400 italic">No job matches recorded yet. Use the Job Match tab.</p>
          : (
            <div className="space-y-2">
              {history.matches.map((m, i) => (
                <div key={i} className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{m.job_title || 'Untitled Job'}</span>
                    <span className={`font-semibold ${m.match_percentage >= 70 ? 'text-green-600' : m.match_percentage >= 45 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {m.match_percentage}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{new Date(m.matched_at).toLocaleString()}</div>
                  {m.missing_skills_json?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.missing_skills_json.slice(0, 6).map((s: string) => (
                        <span key={s} className="bg-red-50 text-red-500 px-1.5 py-0.5 rounded text-xs">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
