'use client';

import { useState } from 'react';
import UploadSection from '@/components/UploadSection';
import AnalysisResults from '@/components/AnalysisResults';
import type { ParseResponse } from '@/types/resume';

export default function HomePage() {
  const [result, setResult] = useState<ParseResponse | null>(null);

  function handleParsed(data: ParseResponse) {
    setResult(data);
    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  return (
    <div className="space-y-8">
      <UploadSection onParsed={handleParsed} />
      {result && (
        <div id="results">
          <AnalysisResults data={result} />
        </div>
      )}
    </div>
  );
}
