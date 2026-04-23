import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const candidateProfiles = pgTable(
  "candidate_profiles",
  {
    id: uuid("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email"),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    yearsExperience: integer("years_experience"),
    currentRole: text("current_role"),
    location: text("location"),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("candidate_profiles_email_idx").on(table.email),
  }),
);

export const resumes = pgTable(
  "resumes",
  {
    id: uuid("id").primaryKey(),
    candidateId: uuid("candidate_id").references(() => candidateProfiles.id, {
      onDelete: "set null",
    }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileHash: text("file_hash").notNull(),
    storageKey: text("storage_key").notNull(),
    downloadUrl: text("download_url").notNull(),
    status: text("status").notNull(),
    extractedText: text("extracted_text"),
    ingestError: text("ingest_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    fileHashIdx: index("resumes_file_hash_idx").on(table.fileHash),
    candidateIdx: index("resumes_candidate_id_idx").on(table.candidateId),
    createdAtIdx: index("resumes_created_at_idx").on(table.createdAt),
  }),
);

export const resumeChunks = pgTable(
  "resume_chunks",
  {
    id: uuid("id").primaryKey(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    resumeIdIdx: index("resume_chunks_resume_id_idx").on(table.resumeId),
  }),
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    createdAtIdx: index("jobs_created_at_idx").on(table.createdAt),
  }),
);

export const ingestJobs = pgTable(
  "ingest_jobs",
  {
    id: uuid("id").primaryKey(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    resumeIdIdx: index("ingest_jobs_resume_id_idx").on(table.resumeId),
  }),
);

export const matchResults = pgTable(
  "match_results",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: "cascade" }),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    overallScore: doublePrecision("overall_score").notNull(),
    semanticScore: doublePrecision("semantic_score").notNull(),
    keywordScore: doublePrecision("keyword_score").notNull(),
    profileScore: doublePrecision("profile_score").notNull(),
    justification: text("justification").notNull(),
    stage: text("stage").notNull().default("aderente"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    jobIdx: index("match_results_job_id_idx").on(table.jobId),
    jobScoreIdx: index("match_results_job_score_idx").on(
      table.jobId,
      table.overallScore,
    ),
  }),
);

export const pipelineStageHistory = pgTable(
  "pipeline_stage_history",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: "cascade" }),
    fromStage: text("from_stage"),
    toStage: text("to_stage").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    jobIdx: index("pipeline_stage_history_job_id_idx").on(table.jobId),
    jobChangedAtIdx: index("pipeline_stage_history_job_changed_at_idx").on(
      table.jobId,
      table.changedAt,
    ),
  }),
);
