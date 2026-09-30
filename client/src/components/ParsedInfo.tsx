'use client';

import type { ParsedResume } from '@/types/resume';

interface Props {
  parsed: ParsedResume;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide block">{label}</span>
      {value ? (
        <span className="text-sm text-gray-800">{value}</span>
      ) : (
        <span className="text-sm text-gray-300 italic">Not detected</span>
      )}
    </div>
  );
}

export default function ParsedInfo({ parsed }: Props) {
  return (
    <div className="space-y-6">
      {/* Contact */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Contact Information</h3>
        <div className="bg-gray-50 rounded-lg px-4 py-1 divide-y divide-gray-100">
          <Field label="Name"     value={parsed.name} />
          <Field label="Email"    value={parsed.email} />
          <Field label="Phone"    value={parsed.phone} />
          <Field label="Location" value={parsed.location} />
          <Field label="LinkedIn" value={parsed.linkedin} />
          <Field label="GitHub"   value={parsed.github} />
        </div>
      </div>

      {/* Summary */}
      {parsed.summary && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Summary</h3>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3">{parsed.summary}</p>
        </div>
      )}

      {/* Education */}
      {parsed.education?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Education</h3>
          <div className="space-y-2">
            {parsed.education.map((e, i) => (
              <div key={i} className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                <div className="font-medium">{e.institution || '—'}</div>
                <div className="text-gray-500">{[e.degree, e.field].filter(Boolean).join(' · ')}</div>
                <div className="text-gray-400 text-xs">{[e.startYear, e.endYear].filter(Boolean).join(' – ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {parsed.experience?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Experience</h3>
          <div className="space-y-2">
            {parsed.experience.map((e, i) => (
              <div key={i} className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                <div className="font-medium">{e.title || '—'}</div>
                <div className="text-gray-500">{e.company}</div>
                <div className="text-gray-400 text-xs">{[e.startDate, e.endDate].filter(Boolean).join(' – ')}</div>
                {e.description && <p className="text-gray-600 mt-1 text-xs">{e.description.slice(0, 200)}{e.description.length > 200 ? '…' : ''}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {parsed.projects?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Projects</h3>
          <div className="space-y-2">
            {parsed.projects.map((p, i) => (
              <div key={i} className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                <div className="font-medium">{p.name}</div>
                {p.description && <p className="text-gray-600 text-xs mt-1">{p.description.slice(0, 200)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {parsed.certifications?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Certifications</h3>
          <ul className="list-disc list-inside space-y-1">
            {parsed.certifications.map((c, i) => <li key={i} className="text-sm text-gray-700">{c}</li>)}
          </ul>
        </div>
      )}

      {/* Achievements */}
      {parsed.achievements?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Achievements</h3>
          <ul className="list-disc list-inside space-y-1">
            {parsed.achievements.map((a, i) => <li key={i} className="text-sm text-gray-700">{a}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
