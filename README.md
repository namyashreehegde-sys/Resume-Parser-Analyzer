# Resume Parser & Analyzer

A collaborative full-stack project with a Next.js frontend, Express API, resume analysis modules, and a MySQL database.

## Project layout

- `client/` — Next.js web application (port 3000)
- `server/` — Express REST API (port 5000)
- `server/ai/` — PDF/DOCX parsing, skill extraction, scoring, job matching, and assistant
- `server/ai/db/schema.sql` — MySQL database schema

The browser talks to the Express API. The API connects to MySQL; the frontend never connects to the database directly.

## Run locally

Requirements: Node.js 18 or newer, npm, and MySQL 8 or newer.

1. Create the database using `server/ai/db/schema.sql` in MySQL Workbench, or from a terminal run:

   ```sh
   mysql -u root -p < server/ai/db/schema.sql
   ```

2. In one terminal, configure and start the backend:

   ```sh
   cd server
   copy .env.example .env
   npm install
   npm run dev
   ```

   Set `DB_HOST`, `DB_USER`, `DB_PASS`, and `DB_NAME` in `server/.env` for your MySQL account. The default AI provider is `mock`, so no AI key is needed for local development. Keep `.env` private.

3. In a second terminal, start the frontend:

   ```sh
   cd client
   copy .env.example .env.local
   npm install
   npm run dev
   ```

4. Open <http://localhost:3000>. The API health page is <http://localhost:5000/health>.

On macOS/Linux, replace `copy` with `cp` in the environment-file commands. The client defaults to `http://localhost:5000`; set `NEXT_PUBLIC_API_URL` in `client/.env.local` if the API uses another address.

## Publish the team project to GitHub

This folder is connected to the team's `Resume-Parser-Analyzer` GitHub repository. From the project folder:

```sh
git status
git add .gitignore README.md ai-analysis-plan.md client server
git commit -m "Integrate resume parser application"
git push origin main
```

Review `git status` before committing. Do not add `.env`, `.env.local`, `node_modules/`, `.next/`, or uploaded resumes. If GitHub rejects a direct push because `main` is protected, push a feature branch and open a pull request instead.

## Team workflow

Keep the shared app in one repository. Each person should pull the latest `main`, work on a separate branch, and make a pull request for their part. Agree on the API request/response fields and database schema before merging, and have one teammate review and integrate the pull requests. Avoid independently copying complete repository folders into one another.

## Main API routes

All analysis routes are mounted below `/api/ai`:

- `POST /parse` — upload and analyze a PDF or DOCX resume
- `GET /resume/:id` — retrieve a stored analysis
- `POST /match` — compare a resume with a job description
- `POST /assistant` — ask the assistant about a resume
- `GET /resumes` — list resumes

See `server/ai/API_CONTRACT.md` for request and response details.
