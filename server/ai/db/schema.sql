-- =============================================================================
-- Resume Parser & Analyzer — AI Layer Database Schema
-- Run this file to create all tables required by the AI/analysis module.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS resume_analyzer
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE resume_analyzer;

-- -----------------------------------------------------------------------------
-- 1. resumes — one row per uploaded resume file
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumes (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED    NULL,
  original_filename VARCHAR(255)   NOT NULL,
  file_type        ENUM('pdf','docx') NOT NULL,
  file_path        VARCHAR(500)    NOT NULL,
  uploaded_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. resume_parsed_data — structured fields extracted from a resume
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resume_parsed_data (
  id                   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  resume_id            INT UNSIGNED  NOT NULL,
  full_name            VARCHAR(255)  NULL,
  email                VARCHAR(255)  NULL,
  phone                VARCHAR(50)   NULL,
  location             VARCHAR(255)  NULL,
  linkedin_url         VARCHAR(500)  NULL,
  github_url           VARCHAR(500)  NULL,
  summary              TEXT          NULL,
  education_json       JSON          NULL,
  experience_json      JSON          NULL,
  projects_json        JSON          NULL,
  certifications_json  JSON          NULL,
  achievements_json    JSON          NULL,
  raw_text             LONGTEXT      NULL,
  parsed_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_resume_id (resume_id),
  CONSTRAINT fk_parsed_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. resume_skills — normalized skill rows for filtering / querying
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resume_skills (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  resume_id   INT UNSIGNED  NOT NULL,
  skill_name  VARCHAR(100)  NOT NULL,
  category    ENUM(
    'programming_language','web_technology','framework',
    'database','tool','cloud_devops','soft_skill','other'
  ) NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_resume_id (resume_id),
  CONSTRAINT fk_skills_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. resume_scores — calculated score breakdown
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resume_scores (
  id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  resume_id           INT UNSIGNED  NOT NULL,
  total_score         DECIMAL(5,2)  NOT NULL DEFAULT 0,
  completeness_score  DECIMAL(5,2)  NOT NULL DEFAULT 0,
  skills_score        DECIMAL(5,2)  NOT NULL DEFAULT 0,
  education_score     DECIMAL(5,2)  NOT NULL DEFAULT 0,
  experience_score    DECIMAL(5,2)  NOT NULL DEFAULT 0,
  projects_score      DECIMAL(5,2)  NOT NULL DEFAULT 0,
  contact_score       DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ats_score           DECIMAL(5,2)  NOT NULL DEFAULT 0,
  score_breakdown_json JSON         NULL,
  scored_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_resume_id (resume_id),
  CONSTRAINT fk_scores_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. job_matches — resume vs. job description comparison results
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_matches (
  id                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  resume_id             INT UNSIGNED  NOT NULL,
  job_title             VARCHAR(255)  NULL,
  job_description_text  LONGTEXT      NOT NULL,
  match_percentage      DECIMAL(5,2)  NOT NULL DEFAULT 0,
  matched_skills_json   JSON          NULL,
  missing_skills_json   JSON          NULL,
  keywords_json         JSON          NULL,
  suggestions_json      JSON          NULL,
  matched_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_resume_id (resume_id),
  CONSTRAINT fk_matches_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. assistant_conversations — AI chat history per resume
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  resume_id   INT UNSIGNED  NOT NULL,
  role        ENUM('user','assistant') NOT NULL,
  message     TEXT          NOT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_resume_id (resume_id),
  CONSTRAINT fk_conv_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
