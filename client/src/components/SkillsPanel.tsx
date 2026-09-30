'use client';

import type { Skill } from '@/types/resume';

interface Props {
  skills: Skill[];
}

const CATEGORY_LABELS: Record<string, string> = {
  programming_language: 'Programming Languages',
  web_technology:       'Web Technologies',
  framework:            'Frameworks',
  database:             'Databases',
  tool:                 'Tools',
  cloud_devops:         'Cloud & DevOps',
  soft_skill:           'Soft Skills',
  other:                'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  programming_language: 'bg-purple-100 text-purple-700',
  web_technology:       'bg-blue-100 text-blue-700',
  framework:            'bg-indigo-100 text-indigo-700',
  database:             'bg-green-100 text-green-700',
  tool:                 'bg-yellow-100 text-yellow-700',
  cloud_devops:         'bg-orange-100 text-orange-700',
  soft_skill:           'bg-pink-100 text-pink-700',
  other:                'bg-gray-100 text-gray-600',
};

export default function SkillsPanel({ skills }: Props) {
  if (!skills || skills.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <div className="text-3xl mb-2">🔍</div>
        <p>No skills detected. Make sure your resume has a Skills section.</p>
      </div>
    );
  }

  // Group by category
  const grouped: Record<string, Skill[]> = {};
  for (const s of skills) {
    const cat = s.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-gray-500">
        {skills.length} skill{skills.length !== 1 ? 's' : ''} detected across {Object.keys(grouped).length} categories
      </div>
      {Object.entries(grouped).map(([cat, catSkills]) => (
        <div key={cat}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {CATEGORY_LABELS[cat] || cat}
          </h3>
          <div className="flex flex-wrap gap-2">
            {catSkills.map(s => (
              <span key={s.name} className={`px-3 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
