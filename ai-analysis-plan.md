# AI, Resume Analysis & System Integration — Implementation Plan

> **Scope:** This plan covers only the AI/analysis layer of the Resume Parser & Analyzer project.
> The frontend, backend (Express routes/middleware), and MySQL schema are owned by separate teams.
> Every decision here is designed to slot into their work without conflict.

---

## Top-Level Overview

The AI/analysis layer is a **self-contained service module** that lives inside the backend repository.
It exposes a small set of REST endpoints (mounted by the backend team on the Express server) and
reads/writes only the MySQL tables it defines (proposed to the DB team for adoption).

The module does **no file serving, no authentication, and no session management** — those concerns
belong to the backend team. The module receives an already-uploaded file path (or buffer), performs
analysis, persists results, and returns structured JSON.

### Core responsibilities
1. Parse PDF/DOCX resumes into structured JSON.
2. Extract and categorize skills from parsed text.
3. Score a resume across seven weighted dimensions.
4. Match a resume against a job description and surface gaps.
5. Power an optional AI assistant chat (OpenAI/Gemini, falls back to mock).
6. Propose the MySQL schema needed for persistence.
7. Define the exact API contract so the frontend team can integrate without surprises.

---

## Sub-Task 1 — Folder & File Structure

**Status:** `[ ] pending`

### Intent
Establish the directory layout for the AI/analysis layer so all teammates know exactly where AI code lives
and no files collide with existing backend or frontend folders.

### Expected Outcomes
- A `server/ai/` folder tree is agreed upon and documented.
- All subsequent sub-tasks know where to place their files.

### Todo List
1. Create `server/ai/` as the root for all analysis code.
2. Create the following sub-folders:
   - `server/ai/parser/` — PDF and DOCX extraction logic.
   - `server/ai/extractor/` — skill extraction and keyword logic.
   - `server/ai/scorer/` — scoring engine.
   - `server/ai/matcher/` — job-description matching.
   - `server/ai/assistant/` — AI assistant chat logic.
   - `server/ai/routes/` — Express route handlers (mounted by backend team).
   - `server/ai/utils/` — shared helpers (text cleaning, regex, constants).
   - `server/ai/db/` — all MySQL queries for the AI layer (no ORM duplication).
3. Create `server/ai/index.js` — the single entry point the backend team imports and mounts.
4. Create `server/ai/constants/skillDictionary.js` — the master keyword lists.

### Relevant Context
- Backend team owns `server/` root files (e.g. `app.js`, `server.js`). Do not touch those.
- The backend team will add one line to mount the AI router: `app.use('/api/ai', aiRouter)`.

---

## Sub-Task 2 — Database Schema (Proposed to DB Team)

**Status:** `[ ] pending`

### Intent
Define exactly which MySQL tables the AI layer needs, with column names, types, and relationships,
so the DB team can create them alongside any tables they already planned.

### Expected Outcomes
- A `server/ai/db/schema.sql` file containing all `CREATE TABLE` statements.
- DB team can run this file alongside their own schema without conflicts.

### Todo List

1. **Create `resumes` table** — stores one row per uploaded resume.
   ```
   resumes
   -------
   id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
   user_id          INT UNSIGNED NULL          -- FK to users table (if backend team creates one)
   original_filename VARCHAR(255) NOT NULL
   file_type        ENUM('pdf','docx') NOT NULL
   file_path        VARCHAR(500) NOT NULL       -- path on disk / object storage key
   uploaded_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ```

2. **Create `resume_parsed_data` table** — stores structured fields extracted from a resume.
   ```
   resume_parsed_data
   ------------------
   id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
   resume_id        INT UNSIGNED NOT NULL REFERENCES resumes(id)
   full_name        VARCHAR(255)
   email            VARCHAR(255)
   phone            VARCHAR(50)
   location         VARCHAR(255)
   linkedin_url     VARCHAR(500)
   github_url       VARCHAR(500)
   summary          TEXT
   education_json   JSON    -- array of { institution, degree, field, start, end }
   experience_json  JSON    -- array of { company, title, start, end, description }
   projects_json    JSON    -- array of { name, description, technologies }
   certifications_json JSON -- array of { name, issuer, date }
   achievements_json   JSON -- array of strings
   raw_text         LONGTEXT  -- full extracted text, used for re-analysis
   parsed_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ```

3. **Create `resume_skills` table** — normalized skill rows for filtering/querying.
   ```
   resume_skills
   -------------
   id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
   resume_id        INT UNSIGNED NOT NULL REFERENCES resumes(id)
   skill_name       VARCHAR(100) NOT NULL
   category         ENUM(
                      'programming_language','web_technology',
                      'framework','database','tool',
                      'cloud_devops','soft_skill','other'
                    ) NOT NULL
   ```

4. **Create `resume_scores` table** — stores the calculated score breakdown.
   ```
   resume_scores
   -------------
   id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
   resume_id           INT UNSIGNED NOT NULL REFERENCES resumes(id)
   total_score         DECIMAL(5,2)  -- 0.00 – 100.00
   completeness_score  DECIMAL(5,2)
   skills_score        DECIMAL(5,2)
   education_score     DECIMAL(5,2)
   experience_score    DECIMAL(5,2)
   projects_score      DECIMAL(5,2)
   contact_score       DECIMAL(5,2)
   ats_score           DECIMAL(5,2)
   score_breakdown_json JSON  -- full breakdown with weight and raw points per dimension
   scored_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ```

5. **Create `job_matches` table** — stores one row per resume+JD comparison.
   ```
   job_matches
   -----------
   id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
   resume_id           INT UNSIGNED NOT NULL REFERENCES resumes(id)
   job_title           VARCHAR(255)
   job_description_text LONGTEXT NOT NULL
   match_percentage    DECIMAL(5,2)
   matched_skills_json  JSON  -- array of skill strings
   missing_skills_json  JSON  -- array of skill strings
   keywords_json        JSON  -- array of important keywords found in JD
   suggestions_json     JSON  -- array of improvement suggestion strings
   matched_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ```

6. **Create `assistant_conversations` table** — stores AI chat messages per resume.
   ```
   assistant_conversations
   -----------------------
   id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
   resume_id   INT UNSIGNED NOT NULL REFERENCES resumes(id)
   role        ENUM('user','assistant') NOT NULL
   message     TEXT NOT NULL
   created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ```

7. Write all six statements into `server/ai/db/schema.sql`.
8. Coordinate with DB team: share this file; they run it together with their schema.

---

## Sub-Task 3 — Resume Parser

**Status:** `[ ] pending`

### Intent
Build a parser that accepts a PDF or DOCX file and returns a single structured JavaScript object
containing all 13 resume fields. No information is invented — if a field is not found, it returns `null`.

### Expected Outcomes
- `server/ai/parser/pdfParser.js` extracts raw text from PDF using `pdf-parse`.
- `server/ai/parser/docxParser.js` extracts raw text from DOCX using `mammoth`.
- `server/ai/parser/resumeParser.js` orchestrates both and runs section detection on the raw text.
- Given a real resume file, the parser returns a populated object with all 13 fields.

### Todo List

1. **Install dependencies** (add to `package.json` in the backend):
   - `pdf-parse` — PDF text extraction.
   - `mammoth` — DOCX text extraction.

2. **PDF extraction** (`pdfParser.js`):
   - Accept a file buffer or file path.
   - Call `pdf-parse` to obtain the full plain-text string.
   - Return `{ rawText, pageCount }`.

3. **DOCX extraction** (`docxParser.js`):
   - Accept a file buffer or file path.
   - Call `mammoth.extractRawText()` to obtain plain text.
   - Return `{ rawText }`.

4. **Section detection strategy** (`resumeParser.js`):
   - Split raw text into lines; trim and normalise whitespace.
   - Identify section headers by matching against a fixed list of known headers
     (case-insensitive): `SUMMARY`, `OBJECTIVE`, `EDUCATION`, `EXPERIENCE`, `WORK EXPERIENCE`,
     `SKILLS`, `TECHNICAL SKILLS`, `PROJECTS`, `CERTIFICATIONS`, `ACHIEVEMENTS`, `AWARDS`.
   - Assign each line to the current open section until the next header is found.

5. **Field extraction rules** (all regex-based, no AI needed here):
   - **Email** — RFC-5321 simplified regex on full raw text.
   - **Phone** — international and local formats: `+91-XXXXXXXXXX`, `(XXX) XXX-XXXX`, `XXXXXXXXXX`.
   - **LinkedIn** — detect `linkedin.com/in/` URL pattern.
   - **GitHub** — detect `github.com/` URL pattern.
   - **Name** — first non-empty line of the document that is NOT a known header, email, phone, or URL.
   - **Location** — look for city/state/country patterns near the top of the document (heuristic line scan).
   - **Summary** — text captured under the SUMMARY or OBJECTIVE section header.
   - **Education** — lines under EDUCATION section parsed for institution name, degree keyword
     (`B.Tech`, `B.Sc`, `M.Tech`, `MBA`, `Bachelor`, `Master`, `PhD`), year pattern `(19|20)\d\d`.
   - **Experience** — lines under EXPERIENCE section; detect company/title/date blocks using
     year or month patterns (`Jan|Feb|…|Dec`) to separate entries.
   - **Skills** — lines under SKILLS section; split by comma, pipe, bullet.
   - **Projects** — lines under PROJECTS section; first line of each block = project name,
     rest = description.
   - **Certifications** — lines under CERTIFICATIONS section; each non-empty line = one cert.
   - **Achievements** — lines under ACHIEVEMENTS or AWARDS section; each non-empty line = one item.

6. **Return shape** — parser always returns:
   ```
   {
     name, email, phone, location, linkedin, github,
     summary,
     education: [ { institution, degree, field, startYear, endYear } ],
     experience: [ { company, title, startDate, endDate, description } ],
     skills: [ string ],
     projects:  [ { name, description, technologies: [ string ] } ],
     certifications: [ string ],
     achievements: [ string ],
     rawText
   }
   ```
   Any field not found = `null` (arrays not found = `[]`).

7. **Edge cases to handle:**
   - Two-column PDF layouts (text order may be scrambled) — log a warning, still return partial data.
   - Empty file — throw a structured error `{ code: 'EMPTY_FILE' }`.
   - Corrupted PDF — catch `pdf-parse` error and throw `{ code: 'PARSE_FAILURE' }`.

### Relevant Context
- `pdf-parse` npm package: accepts a Buffer, returns `{ text, numpages }`.
- `mammoth` npm package: `mammoth.extractRawText({ buffer })` returns `{ value: string }`.

---

## Sub-Task 4 — Skill Extraction & Categorization

**Status:** `[ ] pending`

### Intent
Take the raw skills list from the parser (and the full raw text for bonus coverage) and produce
categorized skill objects that populate `resume_skills` and feed the scorer and matcher.

### Expected Outcomes
- `server/ai/extractor/skillExtractor.js` returns a categorized skill array.
- `server/ai/constants/skillDictionary.js` holds all keyword lists — easy to extend.

### Todo List

1. **Build the skill dictionary** (`skillDictionary.js`):

   Define a `SKILL_CATEGORIES` object with the following keys and representative initial keyword lists
   (the DB/backend teams can expand these without touching logic):

   | Category Key | Example Keywords |
   |---|---|
   | `programming_language` | JavaScript, Python, Java, C++, C#, TypeScript, Go, Rust, PHP, Ruby, Swift, Kotlin, R, MATLAB |
   | `web_technology` | HTML, CSS, REST, GraphQL, WebSocket, XML, JSON, AJAX, SASS, LESS |
   | `framework` | React, Next.js, Angular, Vue, Express, Django, Flask, Spring, Laravel, Rails, FastAPI, NestJS |
   | `database` | MySQL, PostgreSQL, MongoDB, Redis, SQLite, Oracle, Cassandra, DynamoDB, Firebase |
   | `tool` | Git, GitHub, Docker, Webpack, Vite, Babel, ESLint, Postman, Figma, JIRA, VS Code |
   | `cloud_devops` | AWS, Azure, GCP, Kubernetes, CI/CD, Jenkins, GitHub Actions, Terraform, Linux, Nginx |
   | `soft_skill` | Leadership, Communication, Teamwork, Problem Solving, Time Management, Agile, Scrum |

2. **Matching strategy** (`skillExtractor.js`):
   - Combine the parser's `skills[]` array with all tokens found in `experience[].description`
     and `projects[].description` (full-text scan).
   - For each keyword in `SKILL_CATEGORIES`, perform a **case-insensitive whole-word** match
     against the combined token set.
   - A skill is included if it matches at least one keyword entry.
   - De-duplicate (case-insensitive) before returning.

3. **Return shape**:
   ```
   [
     { name: 'React', category: 'framework' },
     { name: 'MySQL', category: 'database' },
     ...
   ]
   ```

4. **Normalisation rule**: store skill names in their canonical casing from the dictionary
   (e.g. raw text `REACTJS` → stored as `React`).

### Relevant Context
- This module is pure logic — no DB access, no file I/O, easy to unit test in isolation.

---

## Sub-Task 5 — Resume Scoring Engine

**Status:** `[ ] pending`

### Intent
Produce a transparent, reproducible score (0–100) with a per-dimension breakdown, so the frontend
can show users exactly why they received their score and what to improve.

### Expected Outcomes
- `server/ai/scorer/resumeScorer.js` returns a score object matching the `resume_scores` schema.
- The score is labelled as an **approximate project metric** in all API responses and UI copy.

### Todo List

1. **Define the seven dimensions and their weights** (`resumeScorer.js`):

   | Dimension | Weight | What is evaluated |
   |---|---|---|
   | Completeness | 20 % | How many of the 13 fields are non-null/non-empty |
   | Skills | 25 % | Count of extracted skills vs. benchmark thresholds |
   | Education | 15 % | Presence and detail of education entries |
   | Experience | 20 % | Number of experience entries and date coverage |
   | Projects | 10 % | Number of projects and technology mentions |
   | Contact Info | 5 % | Presence of email, phone, LinkedIn, GitHub |
   | ATS Signals | 5 % | Use of standard section headers; no special characters in headers |

2. **Completeness score (0–20)**:
   - 13 fields tracked: name, email, phone, location, linkedin, github, summary,
     education, experience, skills, projects, certifications, achievements.
   - Each present and non-empty field = 1 point (max 13 raw points).
   - Scale: `(filledCount / 13) × 20`.

3. **Skills score (0–25)**:
   - 0–4 skills → 0–10 pts, 5–9 → 10–18 pts, 10–14 → 18–22 pts, 15+ → 22–25 pts.
   - Bonus +3 pts if skills span ≥ 3 different categories (shows breadth).
   - Cap at 25.

4. **Education score (0–15)**:
   - No education entries → 0.
   - 1 entry with degree keyword → 8 pts.
   - 1 entry with degree + institution + years → 12 pts.
   - 2+ entries → 15 pts.

5. **Experience score (0–20)**:
   - No entries → 0.
   - 1 entry → 8 pts.
   - 2 entries → 13 pts.
   - 3+ entries → 17 pts.
   - Bonus +3 pts if all entries include start and end dates.
   - Cap at 20.

6. **Projects score (0–10)**:
   - No projects → 0.
   - 1 project → 4 pts.
   - 2 projects → 7 pts.
   - 3+ projects → 10 pts.

7. **Contact info score (0–5)**:
   - Email present → 2 pts.
   - Phone present → 1 pt.
   - LinkedIn present → 1 pt.
   - GitHub present → 1 pt.

8. **ATS signals score (0–5)**:
   - All standard section headers detected (no custom/decorated headers) → 3 pts.
   - No tables or columns detected in raw text (no pipe-heavy lines) → 1 pt.
   - Summary/Objective section present → 1 pt.

9. **Total score**: sum of all dimension scores (max 100).

10. **Return shape** (matches `resume_scores` schema):
    ```
    {
      total_score,
      completeness_score,
      skills_score,
      education_score,
      experience_score,
      projects_score,
      contact_score,
      ats_score,
      score_breakdown_json: {
        completeness: { raw, max, weight, points },
        skills:       { raw, max, weight, points },
        education:    { raw, max, weight, points },
        experience:   { raw, max, weight, points },
        projects:     { raw, max, weight, points },
        contact:      { raw, max, weight, points },
        ats:          { raw, max, weight, points }
      }
    }
    ```

11. **Disclaimer**: every API response that includes a score must include the field:
    `"score_disclaimer": "This score is an approximate project metric and does not guarantee ATS success or hiring outcomes."`

---

## Sub-Task 6 — Job Description Matching

**Status:** `[ ] pending`

### Intent
Accept a resume's extracted data + a raw job description string, and return a structured match
report: what the candidate has, what they are missing, key JD keywords, and a percentage.

### Expected Outcomes
- `server/ai/matcher/jobMatcher.js` returns a match report matching the `job_matches` schema.

### Todo List

1. **JD pre-processing** (`jobMatcher.js`):
   - Lowercase the job description text.
   - Tokenize into words; remove stop-words (a, the, and, to, for, with, …).
   - Apply the same `SKILL_CATEGORIES` dictionary scan to extract a set of "JD required skills".
   - Additionally, extract "keywords" = any noun-like capitalized tokens or known tech terms
     (scan against a broader keywords list in `skillDictionary.js`).

2. **Matching calculation**:
   - `matched_skills` = intersection of `resumeSkills` (names) and `jdRequiredSkills` (names),
     both compared case-insensitively.
   - `missing_skills` = `jdRequiredSkills` minus `matched_skills`.
   - `match_percentage` = `(matched_skills.length / jdRequiredSkills.length) × 100`, rounded to 1 decimal.
   - If `jdRequiredSkills.length === 0`, set `match_percentage = 0` and return a note.

3. **Keywords**:
   - Extract all tokens from the JD that appear in `skillDictionary.js` (any category) plus
     any word appearing ≥ 3 times in the JD and not in the stop-word list.
   - Return top 20 keywords sorted by frequency descending.

4. **Improvement suggestions (rule-based)**:
   - For each missing skill that appears in the JD more than once → "Add [skill] to your Skills section."
   - If `match_percentage < 50` → "Your profile matches less than half the job requirements. Consider gaining experience in: [top 3 missing skills]."
   - If experience entries < 2 → "Adding more work experience or internship entries would strengthen your profile."
   - If no projects → "Adding relevant projects demonstrating [top missing skill] could improve your match."

5. **Return shape** (matches `job_matches` schema):
   ```
   {
     match_percentage,
     matched_skills: [ string ],
     missing_skills:  [ string ],
     keywords:        [ string ],
     suggestions:     [ string ]
   }
   ```

---

## Sub-Task 7 — AI Assistant

**Status:** `[ ] pending`

### Intent
Provide an optional conversational assistant that answers natural-language questions about the
resume. Uses OpenAI or Gemini when an API key is present; falls back to a rule-based mock.

### Expected Outcomes
- `server/ai/assistant/assistantService.js` handles one chat turn.
- Works in mock mode with zero external dependencies when no API key is set.

### Todo List

1. **Environment variable setup**:
   - `AI_PROVIDER` = `openai` | `gemini` | `mock` (default: `mock`).
   - `OPENAI_API_KEY` — required when `AI_PROVIDER=openai`.
   - `GEMINI_API_KEY` — required when `AI_PROVIDER=gemini`.
   - Document these in `server/ai/.env.example`.

2. **System prompt construction**:
   - Before calling the AI API, build a system prompt that injects the resume's parsed data
     and score breakdown as a structured text block.
   - Example prefix:
     ```
     You are a resume advisor. The candidate's resume data is:
     Name: {name}
     Skills: {skills}
     Score breakdown: {score_breakdown}
     Missing skills vs last job description: {missing_skills}
     Answer the user's question based only on this data.
     ```

3. **OpenAI adapter** (`assistantService.js`, openai branch):
   - Use `openai` npm package.
   - Call `chat.completions.create` with `model: 'gpt-3.5-turbo'` (configurable via env).
   - Pass system prompt + conversation history (up to last 10 turns to limit tokens).

4. **Gemini adapter** (`assistantService.js`, gemini branch):
   - Use `@google/generative-ai` npm package.
   - Call `generateContent` with equivalent system + history context.

5. **Mock adapter** (default when no key or `AI_PROVIDER=mock`):
   - Pattern-match the user's question against known question types:
     - "missing skills" → return the `missing_skills` list with a template message.
     - "strongest" / "best" → list the highest-scoring dimensions from the score breakdown.
     - "improve" / "suggestion" → return the suggestions list from the last job match.
     - "highlight" / "projects" → return project names and technologies.
     - "keywords" → return the keywords from the last job match.
     - Default fallback → "I can answer questions about missing skills, your resume strengths, improvement suggestions, projects, and job keywords."
   - The mock must never return fabricated information.

6. **Conversation persistence**:
   - Each call appends the user message and assistant response to `assistant_conversations` table.
   - The route handler passes the last N messages from the DB as conversation history.

7. **Return shape**:
   ```
   {
     reply: string,
     provider: 'openai' | 'gemini' | 'mock'
   }
   ```

---

## Sub-Task 8 — REST API Routes

**Status:** `[ ] pending`

### Intent
Define all API endpoints the AI layer exposes, with exact request/response contracts, so the
frontend team can integrate without ambiguity and the backend team can mount them cleanly.

### Expected Outcomes
- `server/ai/routes/analysisRoutes.js` defines all routes.
- `server/ai/index.js` exports the router for mounting.
- A copy of the contract is documented in `server/ai/API_CONTRACT.md`.

### Todo List

1. **POST `/api/ai/parse`** — Parse an uploaded resume.
   - **Request**: `multipart/form-data` with field `resume` (PDF or DOCX, max 5 MB).
   - **Response (200)**:
     ```json
     {
       "resume_id": 1,
       "parsed": { ...all 13 fields... },
       "skills": [ { "name": "React", "category": "framework" } ],
       "score": { "total_score": 74.5, "score_breakdown_json": {...}, "score_disclaimer": "..." },
       "message": "Resume parsed and analyzed successfully"
     }
     ```
   - **Error responses**: 400 (invalid file), 415 (unsupported type), 422 (empty/parse failure), 500.

2. **GET `/api/ai/resume/:resumeId`** — Retrieve stored analysis for a resume.
   - **Response (200)**:
     ```json
     {
       "resume_id": 1,
       "parsed": {...},
       "skills": [...],
       "score": {...}
     }
     ```

3. **POST `/api/ai/match`** — Match resume against a job description.
   - **Request** (JSON body):
     ```json
     {
       "resume_id": 1,
       "job_title": "Frontend Developer",
       "job_description": "We are looking for a React developer with..."
     }
     ```
   - **Response (200)**:
     ```json
     {
       "match_id": 5,
       "match_percentage": 72.0,
       "matched_skills": ["React", "JavaScript"],
       "missing_skills": ["TypeScript", "GraphQL"],
       "keywords": ["frontend", "component", "API"],
       "suggestions": ["Add TypeScript to your Skills section."]
     }
     ```

4. **GET `/api/ai/matches/:resumeId`** — Get all job matches for a resume.
   - **Response (200)**: array of match records.

5. **POST `/api/ai/assistant`** — Send a chat message to the assistant.
   - **Request** (JSON body):
     ```json
     {
       "resume_id": 1,
       "message": "What skills am I missing for a frontend role?"
     }
     ```
   - **Response (200)**:
     ```json
     {
       "reply": "Based on your resume, you are missing TypeScript and GraphQL...",
       "provider": "openai"
     }
     ```

6. **GET `/api/ai/history/:resumeId`** — Get analysis history (all scores + matches for a resume).
   - **Response (200)**:
     ```json
     {
       "resume_id": 1,
       "scores": [ { "scored_at": "...", "total_score": 74.5, ... } ],
       "matches": [ { "matched_at": "...", "job_title": "...", "match_percentage": 72.0 } ]
     }
     ```

7. **File validation middleware** (`server/ai/utils/fileValidator.js`):
   - Check MIME type against allowlist: `application/pdf`,
     `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
   - Check file size ≤ 5 MB.
   - Check file extension: `.pdf` or `.docx` only.
   - Return `{ valid: boolean, error?: string }`.

---

## Sub-Task 9 — Database Access Layer

**Status:** `[ ] pending`

### Intent
Provide a thin, non-duplicating MySQL access layer for the AI module. All SQL stays in `server/ai/db/`;
no ORM, no duplication of any query the backend team may already have.

### Expected Outcomes
- `server/ai/db/resumeQueries.js` — CRUD for resumes + parsed data.
- `server/ai/db/skillQueries.js` — insert/query skills.
- `server/ai/db/scoreQueries.js` — insert/query scores.
- `server/ai/db/matchQueries.js` — insert/query job matches.
- `server/ai/db/assistantQueries.js` — insert/query conversation messages.
- A shared `server/ai/db/connection.js` that re-uses the backend team's MySQL pool if they export one,
  or creates its own using the same environment variables (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`).

### Todo List

1. **`connection.js`**: import the backend team's db pool if the path `../../config/db` exists;
   otherwise create a new `mysql2/promise` pool using env vars. This avoids double connections.

2. **`resumeQueries.js`**:
   - `insertResume(filename, fileType, filePath, userId?)` → returns inserted `id`.
   - `insertParsedData(resumeId, parsedObj)` → returns inserted `id`.
   - `getParsedData(resumeId)` → returns row.
   - `getAllResumes(userId?)` → returns array of resume rows.

3. **`skillQueries.js`**:
   - `insertSkills(resumeId, skillsArray)` → bulk insert, ignore duplicates.
   - `getSkills(resumeId)` → returns array of `{ skill_name, category }`.

4. **`scoreQueries.js`**:
   - `insertScore(resumeId, scoreObj)` → returns inserted `id`.
   - `getLatestScore(resumeId)` → returns most recent score row.
   - `getScoreHistory(resumeId)` → returns all score rows for that resume.

5. **`matchQueries.js`**:
   - `insertMatch(resumeId, jobTitle, jdText, matchObj)` → returns inserted `id`.
   - `getMatches(resumeId)` → returns all match rows for that resume.

6. **`assistantQueries.js`**:
   - `insertMessage(resumeId, role, message)` → returns inserted `id`.
   - `getConversation(resumeId, limit=20)` → returns last N messages in order.

---

## Sub-Task 10 — Error Handling

**Status:** `[ ] pending`

### Intent
Ensure every failure mode surfaces a consistent, informative JSON error response and is logged
without leaking internal details to the client.

### Expected Outcomes
- `server/ai/utils/errorHandler.js` exports a middleware and a helper `aiError(code, message, status)`.
- All route handlers use structured error objects.

### Todo List

1. **Define error codes and HTTP statuses**:

   | Code | HTTP | Meaning |
   |---|---|---|
   | `INVALID_FILE` | 400 | No file, wrong field name |
   | `UNSUPPORTED_FORMAT` | 415 | Not PDF or DOCX |
   | `FILE_TOO_LARGE` | 413 | Exceeds 5 MB |
   | `EMPTY_RESUME` | 422 | File parsed to empty text |
   | `PARSE_FAILURE` | 422 | pdf-parse or mammoth threw |
   | `RESUME_NOT_FOUND` | 404 | resumeId does not exist in DB |
   | `DB_ERROR` | 500 | MySQL query failed |
   | `AI_ERROR` | 502 | External AI API returned an error |
   | `AI_UNAVAILABLE` | 503 | API key missing but provider not mock |
   | `UNKNOWN_ERROR` | 500 | Unhandled exception |

2. **Error response shape** (always JSON):
   ```json
   {
     "error": true,
     "code": "PARSE_FAILURE",
     "message": "Could not extract text from the uploaded file.",
     "timestamp": "2025-01-01T00:00:00Z"
   }
   ```

3. **Logging**: log full stack trace to server console (or file logger if backend team uses one);
   never include stack trace in the response body.

4. **AI API failure fallback**: if `AI_PROVIDER` is `openai` or `gemini` and the call fails,
   automatically fall back to the mock adapter and include `"provider": "mock"` in the response
   so the frontend can inform the user.

5. **Partial parse handling**: if parsing succeeds but some fields are null, return 200 with
   `"warnings": ["name not detected", "location not detected"]` — not a 4xx.

---

## Sub-Task 11 — Security

**Status:** `[ ] pending`

### Intent
Protect the file upload pipeline and analysis outputs against common attack vectors.

### Expected Outcomes
- File validation is enforced before any processing occurs.
- No sensitive data leaks through API responses.
- All secrets stored only in environment variables.

### Todo List

1. **File validation** (enforced in middleware before route handler runs):
   - Verify MIME type using `file-type` npm package (reads magic bytes — not just the extension).
   - Reject any file whose magic-byte MIME does not match `application/pdf` or the OOXML MIME.
   - Enforce 5 MB limit via `multer` `limits.fileSize` option.
   - Sanitize the original filename (strip path separators, limit to 255 chars).

2. **Input validation** on JSON body endpoints:
   - `resume_id` must be a positive integer.
   - `job_description` must be a non-empty string, max 20 000 characters.
   - `message` (assistant) must be a non-empty string, max 2 000 characters.
   - Use a lightweight validator (e.g. manual checks or `joi`) — do not trust raw body values.

3. **Environment variables**:
   - `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DB_PASS` must never appear in source code.
   - Document required env vars in `server/ai/.env.example` with placeholder values only.

4. **File storage**:
   - Store uploaded files outside the web-accessible `public/` folder (e.g. `server/uploads/`).
   - Use a UUID-based filename on disk (`<uuid>.<ext>`) — never the original filename.

5. **API security** (deferred to backend team):
   - Rate limiting, JWT authentication, CORS — the backend team owns these.
   - The AI routes should document that they expect an authenticated request context but
     do not implement auth themselves.

6. **PII protection**:
   - Resume raw text and parsed fields (email, phone) are stored in DB — note in `schema.sql`
     that these columns should be considered sensitive and access should be restricted by role
     at the DB level (DB team to enforce).
   - API responses must never include `raw_text` unless explicitly requested by an admin route.

---

## Sub-Task 12 — Frontend Integration Contract

**Status:** `[ ] pending`

### Intent
Define exactly what the frontend team needs to build in order to display all AI/analysis output.
The frontend never touches MySQL — only the API endpoints defined in Sub-Task 8.

### Expected Outcomes
- `server/ai/API_CONTRACT.md` documents all endpoints, shapes, and UI field mappings.
- Frontend team can build their components knowing the exact JSON keys.

### Todo List

1. **Resume Upload Page** — calls `POST /api/ai/parse`:
   - Show loading state during parse.
   - On success: navigate to Analysis Results page, passing `resume_id`.
   - On error: display `error.message` from response.

2. **Analysis Results Page** — calls `GET /api/ai/resume/:resumeId`:
   - **Score card**: display `total_score` as a circular progress indicator.
     Show each dimension score with its label and a coloured bar.
     Always show the `score_disclaimer` text below the score.
   - **Extracted info panel**: display all 13 parsed fields.
     Null fields shown as "Not detected" (greyed out).
   - **Skills panel**: grouped by `category`; each skill as a badge/chip.

3. **Job Match Page** — calls `POST /api/ai/match`:
   - Input: job title text field + job description textarea + submit button.
   - On success:
     - Show `match_percentage` as a percentage ring.
     - Show `matched_skills` as green badges.
     - Show `missing_skills` as red/amber badges.
     - Show `keywords` as a keyword cloud or list.
     - Show `suggestions` as a bulleted action list.

4. **AI Assistant Panel** — calls `POST /api/ai/assistant`:
   - Chat bubble UI.
   - On send: POST message; display `reply` as assistant bubble.
   - Show `provider` badge (OpenAI / Gemini / Mock) so user knows which backend answered.
   - If `provider === 'mock'`, show a subtle note: "Responses are rule-based — add an AI API key for richer answers."

5. **History Page** — calls `GET /api/ai/history/:resumeId`:
   - List of previous scores with timestamps and total score.
   - List of previous job matches with job title and match percentage.

---

## Sub-Task 13 — Testing Plan

**Status:** `[ ] pending`

### Intent
Define a structured testing strategy so each piece of the AI layer can be verified independently
and as a whole system.

### Expected Outcomes
- `server/ai/tests/` folder with test files for each module.
- Every major function has at least one passing and one failing test case.

### Todo List

1. **Unit tests** (Jest or Mocha — match whatever the backend team uses):

   | Test file | What it tests |
   |---|---|
   | `tests/pdfParser.test.js` | Extracts text from a known sample PDF; fails gracefully on empty |
   | `tests/docxParser.test.js` | Extracts text from a known sample DOCX |
   | `tests/resumeParser.test.js` | Detects all 13 fields from a well-formed resume text fixture |
   | `tests/skillExtractor.test.js` | Correctly categorizes known skills; ignores unknown tokens |
   | `tests/resumeScorer.test.js` | Full resume scores ≥ 70; empty resume scores < 20 |
   | `tests/jobMatcher.test.js` | Known overlap produces correct percentage; zero overlap produces 0% |
   | `tests/fileValidator.test.js` | Rejects .exe; rejects >5 MB; accepts valid PDF/DOCX |
   | `tests/assistantMock.test.js` | Each question type returns expected template message |

2. **Integration tests** (`tests/integration/`):

   | Test | What it tests |
   |---|---|
   | `upload.test.js` | POST /api/ai/parse with a real PDF → 200 + resume_id |
   | `match.test.js` | POST /api/ai/match with known resume + JD → match_percentage > 0 |
   | `assistant.test.js` | POST /api/ai/assistant → reply string returned |
   | `history.test.js` | GET /api/ai/history/:id → arrays of scores and matches |
   | `dbStore.test.js` | After parse, rows exist in all five AI tables |

3. **Error case tests**:
   - Upload a `.txt` file → expect 415.
   - Upload an empty PDF → expect 422 with `code: EMPTY_RESUME`.
   - Match with non-existent `resume_id` → expect 404.
   - Assistant with no API key and `AI_PROVIDER=openai` → expect fallback to mock.

4. **Sample test fixtures** (`tests/fixtures/`):
   - `sample_resume.pdf` — a real-looking one-page resume PDF.
   - `sample_resume.docx` — equivalent DOCX.
   - `resume_text.txt` — raw text fixture for parser unit tests.
   - `job_description.txt` — sample JD for matcher tests.

5. **End-to-end test** (`tests/e2e/fullWorkflow.test.js`):
   - Upload resume → parse → score → match against JD → ask assistant question → check history.
   - Verify DB rows exist and API responses are consistent.

---

## Sub-Task 14 — Implementation Order

**Status:** `[ ] pending`

### Intent
Define the exact sequence that avoids conflicts with the frontend, backend, and DB teams.

### Expected Outcomes
- A clear, dependency-respecting sequence that any team member can follow.

### Todo List

Implement strictly in this order:

1. **Sub-Task 1** — Create folder structure and `index.js` entry point.
   *(No logic yet — just structure. Backend team can immediately see where to mount the router.)*

2. **Sub-Task 2** — Write `schema.sql`. Share with DB team immediately so they can create tables.

3. **Sub-Task 3** — Implement `pdfParser.js`, `docxParser.js`, `resumeParser.js`.
   *(No DB required. Unit-testable in isolation.)*

4. **Sub-Task 4** — Implement `skillDictionary.js` and `skillExtractor.js`.
   *(Depends on parser output shape only.)*

5. **Sub-Task 5** — Implement `resumeScorer.js`.
   *(Depends on parsed data + skill list only.)*

6. **Sub-Task 6** — Implement `jobMatcher.js`.
   *(Depends on skill extractor + dictionary.)*

7. **Sub-Task 9** — Implement DB access layer.
   *(Depends on schema being created by DB team.)*

8. **Sub-Task 7** — Implement `assistantService.js`.
   *(Depends on parsed data, score, and match results being available.)*

9. **Sub-Task 8** — Implement routes and wire everything together in `index.js`.
   *(Depends on all logic modules being complete.)*

10. **Sub-Task 10** — Add error handling middleware.
    *(Final pass over all routes.)*

11. **Sub-Task 11** — Add file validator middleware and security checks.
    *(Can be done in parallel with Sub-Task 10.)*

12. **Sub-Task 12** — Write `API_CONTRACT.md` and share with frontend team.
    *(Can be done right after Sub-Task 8; frontend team can start building.)*

13. **Sub-Task 13** — Write and run all tests.
    *(Last, when all modules and DB are in place.)*

---

## Complete Agent-Mode Checklist

Use this checklist during implementation in Agent Mode. Check each item before proceeding to the next.

### Structure
- [ ] `server/ai/` folder created with all sub-folders
- [ ] `server/ai/index.js` exports the Express router
- [ ] `server/ai/constants/skillDictionary.js` created

### Database
- [ ] `server/ai/db/schema.sql` written with all 6 tables
- [ ] Schema shared with DB team and tables confirmed created
- [ ] `server/ai/db/connection.js` written (re-uses backend pool or creates own)
- [ ] `server/ai/db/resumeQueries.js` written
- [ ] `server/ai/db/skillQueries.js` written
- [ ] `server/ai/db/scoreQueries.js` written
- [ ] `server/ai/db/matchQueries.js` written
- [ ] `server/ai/db/assistantQueries.js` written

### Parser
- [ ] `pdf-parse` and `mammoth` added to `package.json`
- [ ] `server/ai/parser/pdfParser.js` written
- [ ] `server/ai/parser/docxParser.js` written
- [ ] `server/ai/parser/resumeParser.js` written
- [ ] Parser returns correct shape with all 13 fields
- [ ] Parser returns `null`/`[]` for missing fields (no invented data)
- [ ] Parser throws structured errors for empty / corrupt files

### Skill Extraction
- [ ] `skillDictionary.js` populated with all 7 categories
- [ ] `server/ai/extractor/skillExtractor.js` written
- [ ] Extractor returns normalized, de-duplicated, categorized skill array
- [ ] Whole-word, case-insensitive matching confirmed working

### Scoring
- [ ] `server/ai/scorer/resumeScorer.js` written
- [ ] All 7 dimensions implemented with correct weights
- [ ] Score total is 0–100
- [ ] `score_disclaimer` field present in every score response
- [ ] `score_breakdown_json` fully populated

### Job Matching
- [ ] `server/ai/matcher/jobMatcher.js` written
- [ ] JD pre-processing and stop-word removal working
- [ ] `match_percentage` calculated correctly (handles 0-skill JD edge case)
- [ ] `suggestions` array generated for all relevant cases

### AI Assistant
- [ ] `server/ai/.env.example` created with all AI env vars
- [ ] `server/ai/assistant/assistantService.js` written
- [ ] Mock adapter returns correct template responses for all question types
- [ ] OpenAI adapter wired (key loaded from env, not hardcoded)
- [ ] Gemini adapter wired (key loaded from env, not hardcoded)
- [ ] Fallback to mock on API failure confirmed

### API Routes
- [ ] `server/ai/routes/analysisRoutes.js` written with all 6 endpoints
- [ ] `POST /api/ai/parse` tested manually
- [ ] `GET /api/ai/resume/:resumeId` tested manually
- [ ] `POST /api/ai/match` tested manually
- [ ] `GET /api/ai/matches/:resumeId` tested manually
- [ ] `POST /api/ai/assistant` tested manually
- [ ] `GET /api/ai/history/:resumeId` tested manually
- [ ] `server/ai/API_CONTRACT.md` written and shared with frontend team

### Error Handling & Security
- [ ] `server/ai/utils/errorHandler.js` written with all error codes
- [ ] `server/ai/utils/fileValidator.js` written (magic-byte MIME check, size limit)
- [ ] All 10 error codes return correct HTTP status and JSON shape
- [ ] API key and DB password are never in source code
- [ ] Uploaded files stored under UUID names in non-public folder
- [ ] Raw text excluded from default API responses

### Tests
- [ ] All 8 unit test files written and passing
- [ ] All 5 integration test files written and passing
- [ ] All 3 error-case tests passing
- [ ] Test fixtures committed to `server/ai/tests/fixtures/`
- [ ] End-to-end workflow test passing

### Handoff
- [ ] `server/ai/index.js` confirmed mountable with one line in `app.js`
- [ ] `API_CONTRACT.md` delivered to frontend team
- [ ] `schema.sql` delivered to DB team
- [ ] `.env.example` committed (no real keys)
