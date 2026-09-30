'use client';

import { useState, useRef } from 'react';
import { parseResume, extractErrorMessage } from '@/lib/api';
import type { ParseResponse } from '@/types/resume';

interface Props {
  onParsed: (data: ParseResponse) => void;
}

export default function UploadSection({ onParsed }: Props) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const data = await parseResume(file);
      onParsed(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-1">Upload Your Resume</h2>
      <p className="text-sm text-gray-500 mb-4">Supported formats: PDF, DOCX · Max size: 5 MB</p>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
          ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300'}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="text-4xl mb-2">📄</div>
        <p className="text-gray-600 font-medium">
          {loading ? 'Analyzing resume…' : 'Drag & drop or click to upload'}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF or DOCX</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={onInputChange}
          disabled={loading}
        />
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-blue-600 text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Parsing resume, extracting skills, and calculating score…
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}
    </section>
  );
}
