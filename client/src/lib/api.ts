// client/src/lib/api.ts
// Axios-based API client — communicates only with the backend API.
// Never connects directly to MySQL.

import axios from 'axios';
import type { ParseResponse, MatchResponse } from '@/types/resume';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api/ai`,
  timeout: 30000,
});

// ── Resume Parsing ────────────────────────────────────────────────────────────
export async function parseResume(file: File, userId?: number): Promise<ParseResponse> {
  const form = new FormData();
  form.append('resume', file);
  if (userId) form.append('user_id', String(userId));

  const { data } = await api.post<ParseResponse>('/parse', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Get stored analysis ───────────────────────────────────────────────────────
export async function getResumeAnalysis(resumeId: number) {
  const { data } = await api.get(`/resume/${resumeId}`);
  return data;
}

// ── Job Matching ──────────────────────────────────────────────────────────────
export async function matchJob(
  resumeId: number,
  jobDescription: string,
  jobTitle?: string
): Promise<MatchResponse> {
  const { data } = await api.post<MatchResponse>('/match', {
    resume_id:       resumeId,
    job_title:       jobTitle || '',
    job_description: jobDescription,
  });
  return data;
}

// ── Get all matches ───────────────────────────────────────────────────────────
export async function getMatches(resumeId: number) {
  const { data } = await api.get(`/matches/${resumeId}`);
  return data;
}

// ── AI Assistant ──────────────────────────────────────────────────────────────
export async function sendAssistantMessage(resumeId: number, message: string) {
  const { data } = await api.post('/assistant', { resume_id: resumeId, message });
  return data as { reply: string; provider: string };
}

// ── History ───────────────────────────────────────────────────────────────────
export async function getHistory(resumeId: number) {
  const { data } = await api.get(`/history/${resumeId}`);
  return data;
}

// ── Resume list ───────────────────────────────────────────────────────────────
export async function getResumes() {
  const { data } = await api.get('/resumes');
  return data;
}

// ── Error extractor ───────────────────────────────────────────────────────────
export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.message || 'An error occurred.';
  }
  if (err instanceof Error) return err.message;
  return 'An unknown error occurred.';
}
