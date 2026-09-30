'use client';

import type { ResumeScore } from '@/types/resume';

interface Props {
  score: ResumeScore;
}

const DIMENSION_LABELS: Record<string, string> = {
  completeness: 'Completeness',
  skills:       'Skills',
  education:    'Education',
  experience:   'Experience',
  projects:     'Projects',
  contact:      'Contact Info',
  ats:          'ATS Signals',
};

function scoreColor(pct: number) {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-400';
  return 'bg-red-400';
}

function scoreLabel(score: number) {
  if (score >= 80) return { label: 'Excellent', color: 'text-green-600' };
  if (score >= 65) return { label: 'Good',      color: 'text-blue-600' };
  if (score >= 45) return { label: 'Average',   color: 'text-yellow-600' };
  return                   { label: 'Needs Work', color: 'text-red-500' };
}

export default function ScoreCard({ score }: Props) {
  const { label, color } = scoreLabel(score.total_score);
  const breakdown = score.score_breakdown_json;

  return (
    <div className="space-y-6">
      {/* Overall score */}
      <div className="flex items-center gap-6">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9"
              fill="none"
              stroke={score.total_score >= 65 ? '#3b82f6' : score.total_score >= 45 ? '#f59e0b' : '#ef4444'}
              strokeWidth="3"
              strokeDasharray={`${score.total_score} ${100 - score.total_score}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-800">{score.total_score}</span>
            <span className="text-xs text-gray-400">/100</span>
          </div>
        </div>
        <div>
          <div className={`text-xl font-semibold ${color}`}>{label}</div>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">{score.score_disclaimer}</p>
        </div>
      </div>

      {/* Dimension bars */}
      {breakdown && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Score Breakdown</h3>
          {Object.entries(breakdown).map(([key, dim]) => {
            const pct = Math.round((dim.points / dim.max) * 100);
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{DIMENSION_LABELS[key] || key} <span className="text-gray-400 text-xs">({dim.weight})</span></span>
                  <span className="font-medium">{dim.points}/{dim.max}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${scoreColor(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
