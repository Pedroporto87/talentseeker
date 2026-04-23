CREATE TABLE IF NOT EXISTS candidate_profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  years_experience INTEGER,
  "current_role" TEXT,
  location TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS candidate_profiles_email_idx
  ON candidate_profiles (email)
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  download_url TEXT NOT NULL,
  status TEXT NOT NULL,
  extracted_text TEXT,
  ingest_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS resumes_file_hash_idx ON resumes (file_hash);
CREATE INDEX IF NOT EXISTS resumes_candidate_id_idx ON resumes (candidate_id);

CREATE TABLE IF NOT EXISTS resume_chunks (
  id UUID PRIMARY KEY,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS resume_chunks_resume_id_idx ON resume_chunks (resume_id);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingest_jobs (
  id UUID PRIMARY KEY,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ingest_jobs_resume_id_idx ON ingest_jobs (resume_id);

CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  overall_score DOUBLE PRECISION NOT NULL,
  semantic_score DOUBLE PRECISION NOT NULL,
  keyword_score DOUBLE PRECISION NOT NULL,
  profile_score DOUBLE PRECISION NOT NULL,
  justification TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'aderente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS match_results_job_id_idx ON match_results (job_id);

CREATE TABLE IF NOT EXISTS pipeline_stage_history (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pipeline_stage_history_job_id_idx
  ON pipeline_stage_history (job_id);
