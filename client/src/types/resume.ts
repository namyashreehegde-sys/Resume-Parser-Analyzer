// client/src/types/resume.ts
// Shared TypeScript types for resume analysis data

export interface Education {
  institution: string | null;
  degree: string | null;
  field: string | null;
  startYear: string | null;
  endYear: string | null;
}

export interface Experience {
  company: string | null;
  title: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
}

export interface ParsedResume {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  summary: string | null;
  education: Education[];
  experience: Experience[];
  skills: string[];
  projects: Project[];
  certifications: string[];
  achievements: string[];
}

export interface Skill {
  name: string;
  category: string;
}

export interface ScoreBreakdownDimension {
  raw: number;
  max: number;
  weight: string;
  points: number;
}

export interface ScoreBreakdown {
  completeness: ScoreBreakdownDimension;
  skills: ScoreBreakdownDimension;
  education: ScoreBreakdownDimension;
  experience: ScoreBreakdownDimension;
  projects: ScoreBreakdownDimension;
  contact: ScoreBreakdownDimension;
  ats: ScoreBreakdownDimension;
}

export interface ResumeScore {
  total_score: number;
  completeness_score: number;
  skills_score: number;
  education_score: number;
  experience_score: number;
  projects_score: number;
  contact_score: number;
  ats_score: number;
  score_breakdown_json: ScoreBreakdown;
  score_disclaimer: string;
}

export interface ParseResponse {
  resume_id: number;
  parsed: ParsedResume;
  skills: Skill[];
  score: ResumeScore;
  warnings: string[];
  message: string;
}

export interface MatchResponse {
  match_id: number;
  resume_id: number;
  job_title: string | null;
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  keywords: string[];
  suggestions: string[];
  jd_skill_count: number;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  message: string;
  provider?: string;
}

export interface ResumeListItem {
  id: number;
  original_filename: string;
  file_type: 'pdf' | 'docx';
  uploaded_at: string;
}
