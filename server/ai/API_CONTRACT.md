# Resume Parser & Analyzer — AI Layer API Contract
# Version 1.0

Base URL: http://localhost:5000/api/ai

All error responses share this shape:
{
  "error": true,
  "code": "ERROR_CODE",
  "message": "User-facing message",
  "timestamp": "ISO-8601"
}

─────────────────────────────────────────────────────────────────────────
1. POST /api/ai/parse
─────────────────────────────────────────────────────────────────────────
Upload, parse, and score a resume in one call.

Request: multipart/form-data
  Field: resume  (File — PDF or DOCX, max 5 MB)
  Field: user_id (optional string/int)

Response 200:
{
  "resume_id": 1,
  "parsed": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1-555-123-4567",
    "location": "San Francisco, CA",
    "linkedin": "linkedin.com/in/janedoe",
    "github": "github.com/janedoe",
    "summary": "Full-stack developer with 3 years...",
    "education": [{ "institution": "MIT", "degree": "B.Tech", "field": null, "startYear": "2018", "endYear": "2022" }],
    "experience": [{ "company": "Acme Corp", "title": "Software Engineer", "startDate": "Jan 2022", "endDate": "Present", "description": "..." }],
    "skills": ["React", "Node.js"],
    "projects": [{ "name": "Portfolio Site", "description": "...", "technologies": ["React","CSS"] }],
    "certifications": ["AWS Certified Developer"],
    "achievements": ["Hackathon Winner 2023"]
  },
  "skills": [
    { "name": "React", "category": "framework" },
    { "name": "MySQL", "category": "database" }
  ],
  "score": {
    "total_score": 74.5,
    "completeness_score": 16.9,
    "skills_score": 22.0,
    "education_score": 12.0,
    "experience_score": 13.0,
    "projects_score": 7.0,
    "contact_score": 4.0,
    "ats_score": 4.0,
    "score_breakdown_json": { ... },
    "score_disclaimer": "This score is an approximate project analysis metric..."
  },
  "warnings": [],
  "message": "Resume parsed and analyzed successfully."
}

Errors: 400 INVALID_FILE | 413 FILE_TOO_LARGE | 415 UNSUPPORTED_FORMAT
        422 EMPTY_RESUME | 422 PARSE_FAILURE | 500 DB_ERROR

─────────────────────────────────────────────────────────────────────────
2. GET /api/ai/resume/:resumeId
─────────────────────────────────────────────────────────────────────────
Retrieve stored analysis for a resume.

Response 200: { "resume_id": 1, "parsed": {...}, "skills": [...], "score": {...} }
Errors: 400 VALIDATION_ERROR | 404 RESUME_NOT_FOUND

─────────────────────────────────────────────────────────────────────────
3. POST /api/ai/match
─────────────────────────────────────────────────────────────────────────
Match a resume against a job description.

Request body (JSON):
{
  "resume_id": 1,
  "job_title": "Frontend Developer",      (optional)
  "job_description": "We are looking for a React developer..."
}

Response 200:
{
  "match_id": 5,
  "resume_id": 1,
  "job_title": "Frontend Developer",
  "match_percentage": 72.0,
  "matched_skills": ["React", "JavaScript"],
  "missing_skills": ["TypeScript", "GraphQL"],
  "keywords": ["frontend", "component", "api"],
  "suggestions": ["Add TypeScript to your Skills section."],
  "jd_skill_count": 8
}

Errors: 400 VALIDATION_ERROR | 404 RESUME_NOT_FOUND | 500 DB_ERROR

─────────────────────────────────────────────────────────────────────────
4. GET /api/ai/matches/:resumeId
─────────────────────────────────────────────────────────────────────────
Get all job matches for a resume.

Response 200: { "resume_id": 1, "matches": [ { all match fields... } ] }
Errors: 400 VALIDATION_ERROR | 404 RESUME_NOT_FOUND

─────────────────────────────────────────────────────────────────────────
5. POST /api/ai/assistant
─────────────────────────────────────────────────────────────────────────
Send a chat message to the AI assistant.

Request body (JSON):
{ "resume_id": 1, "message": "What skills am I missing?" }

Response 200:
{
  "reply": "Based on your resume, you are missing TypeScript and GraphQL...",
  "provider": "mock"  (or "openai" | "gemini")
}

Errors: 400 VALIDATION_ERROR | 404 RESUME_NOT_FOUND

─────────────────────────────────────────────────────────────────────────
6. GET /api/ai/history/:resumeId
─────────────────────────────────────────────────────────────────────────
Get analysis history for a resume.

Response 200:
{
  "resume_id": 1,
  "scores": [ { "scored_at": "...", "total_score": 74.5, ... } ],
  "matches": [ { "matched_at": "...", "job_title": "...", "match_percentage": 72.0 } ]
}

Errors: 400 VALIDATION_ERROR | 404 RESUME_NOT_FOUND

─────────────────────────────────────────────────────────────────────────
7. GET /api/ai/resumes
─────────────────────────────────────────────────────────────────────────
List all uploaded resumes.

Query params: ?user_id=1  (optional)
Response 200: { "resumes": [ { "id", "original_filename", "file_type", "uploaded_at" } ] }
