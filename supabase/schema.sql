-- =============================================
-- Supabase PostgreSQL Schema for Sistem Penjurian
-- Run this SQL in Supabase SQL Editor
-- =============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'judge',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  school TEXT,
  project TEXT,
  category_id INTEGER NOT NULL REFERENCES categories(id)
);

-- Judge-Category assignments
CREATE TABLE IF NOT EXISTS judge_categories (
  id SERIAL PRIMARY KEY,
  judge_id INTEGER NOT NULL REFERENCES users(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  UNIQUE(judge_id, category_id)
);

-- Criteria table
CREATE TABLE IF NOT EXISTS criteria (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  weight INTEGER NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 100,
  display_order INTEGER DEFAULT 0
);

-- Sub-criteria table
CREATE TABLE IF NOT EXISTS sub_criteria (
  id SERIAL PRIMARY KEY,
  criteria_id INTEGER NOT NULL REFERENCES criteria(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  detail TEXT,
  min_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 25,
  display_order INTEGER DEFAULT 0
);

-- Scores table
CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  judge_id INTEGER NOT NULL REFERENCES users(id),
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  sub_criteria_id INTEGER NOT NULL REFERENCES sub_criteria(id),
  score INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(judge_id, participant_id, sub_criteria_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_category ON participants(category_id);
CREATE INDEX IF NOT EXISTS idx_judge_categories_judge ON judge_categories(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_categories_category ON judge_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_scores_judge ON scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_scores_participant ON scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_scores_judge_participant ON scores(judge_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_sub_criteria_criteria ON sub_criteria(criteria_id);
