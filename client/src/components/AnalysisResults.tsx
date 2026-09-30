'use client';

import { useState } from 'react';
import type { ParseResponse } from '@/types/resume';
import ScoreCard from './ScoreCard';
import ParsedInfo from './ParsedInfo';
import SkillsPanel from './SkillsPanel';
import JobMatcher from './JobMatcher';
import AssistantPanel from './AssistantPanel';
import HistoryPanel from './HistoryPanel';

interface Props {
  data: ParseResponse;
}

const TABS = ['Score', 'Info', 'Skills', 'Job Match', 'Assistant', 'History'] as const;
type Tab = (typeof TABS)[number];

export default function AnalysisResults({ data }: Props) {
  const [tab, setTab] = useState<Tab>('Score');

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Success banner */}
      <div className="bg-green-50 border-b border-green-100 px-6 py-3 flex items-center gap-2 text-green-700 text-sm">
        <span>✅</span>
        <span>{data.message}</span>
        {data.warnings?.length > 0 && (
          <span className="ml-auto text-yellow-600 text-xs">
            ⚠ {data.warnings.join(' · ')}
          </span>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors
              ${tab === t
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {tab === 'Score'     && <ScoreCard score={data.score} />}
        {tab === 'Info'      && <ParsedInfo parsed={data.parsed} />}
        {tab === 'Skills'    && <SkillsPanel skills={data.skills} />}
        {tab === 'Job Match' && <JobMatcher resumeId={data.resume_id} skills={data.skills} />}
        {tab === 'Assistant' && <AssistantPanel resumeId={data.resume_id} />}
        {tab === 'History'   && <HistoryPanel resumeId={data.resume_id} />}
      </div>
    </section>
  );
}
