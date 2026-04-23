import type { Row } from "postgres";
import { getSqlClient } from "@/lib/server/db";
import { PIPELINE_STAGES } from "@/lib/types";
import type {
  CandidateProfile,
  DashboardSnapshot,
  IngestJobRecord,
  JobRecord,
  MatchCandidateView,
  PipelineStageHistoryRecord,
  ResumeChunkRecord,
  ResumeRecord,
} from "@/lib/types";
import type {
  AppRepository,
  CandidateProfileInput,
  MatchResultInsert,
  ResumeWithCandidate,
} from "@/lib/server/repositories/types";

type CandidateRow = Row & {
  id: string;
  full_name: string;
  email: string | null;
  skills: string[];
  years_experience: number | null;
  current_role: string | null;
  location: string | null;
  summary: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type ResumeRow = Row & {
  id: string;
  candidate_id: string | null;
  file_name: string;
  mime_type: string;
  file_hash: string;
  storage_key: string;
  download_url: string;
  status: string;
  extracted_text: string | null;
  ingest_error: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type IngestJobRow = Row & {
  id: string;
  resume_id: string;
  status: string;
  error_message: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type JobRow = Row & {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  created_at: string | Date;
  updated_at: string | Date;
};

type ChunkRow = Row & {
  id: string;
  resume_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  created_at: string | Date;
};

type MatchRow = Row & {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_id: string;
  overall_score: number;
  semantic_score: number;
  keyword_score: number;
  profile_score: number;
  justification: string;
  stage: string;
  created_at: string | Date;
  updated_at: string | Date;
};

type PipelineHistoryRow = Row & {
  id: string;
  job_id: string;
  candidate_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_at: string | Date;
};

function iso(value: string | Date | null | undefined) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return "";
    }

    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    console.warn("Timestamp invalido recebido do Postgres:", normalized);
    return normalized;
  }

  if (value == null) {
    return "";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function mapCandidate(row: CandidateRow): CandidateProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    skills: row.skills ?? [],
    yearsExperience: row.years_experience,
    currentRole: row.current_role,
    location: row.location,
    summary: row.summary,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapResume(row: ResumeRow): ResumeRecord {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileHash: row.file_hash,
    storageKey: row.storage_key,
    downloadUrl: row.download_url,
    status: row.status as ResumeRecord["status"],
    extractedText: row.extracted_text,
    ingestError: row.ingest_error,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapIngest(row: IngestJobRow): IngestJobRecord {
  return {
    id: row.id,
    resumeId: row.resume_id,
    status: row.status as IngestJobRecord["status"],
    errorMessage: row.error_message,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapJob(row: JobRow): JobRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    keywords: row.keywords ?? [],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapChunk(row: ChunkRow): ResumeChunkRecord {
  return {
    id: row.id,
    resumeId: row.resume_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    tokenCount: row.token_count,
    createdAt: iso(row.created_at),
  };
}

function mapMatch(row: MatchRow): MatchCandidateView["result"] {
  return {
    id: row.id,
    jobId: row.job_id,
    candidateId: row.candidate_id,
    resumeId: row.resume_id,
    overallScore: Number(row.overall_score),
    semanticScore: Number(row.semantic_score),
    keywordScore: Number(row.keyword_score),
    profileScore: Number(row.profile_score),
    justification: row.justification,
    stage: row.stage as MatchCandidateView["result"]["stage"],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapHistory(row: PipelineHistoryRow): PipelineStageHistoryRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    candidateId: row.candidate_id,
    fromStage: row.from_stage as PipelineStageHistoryRecord["fromStage"],
    toStage: row.to_stage as PipelineStageHistoryRecord["toStage"],
    changedAt: iso(row.changed_at),
  };
}

async function getResumeCandidateBundle(resumeId: string): Promise<ResumeWithCandidate | null> {
  const sql = getSqlClient();
  const [resumeRow] = await sql<ResumeRow[]>`
    SELECT * FROM resumes WHERE id = ${resumeId} LIMIT 1
  `;

  if (!resumeRow) {
    return null;
  }

  const [candidateRow] = resumeRow.candidate_id
    ? await sql<CandidateRow[]>`
        SELECT * FROM candidate_profiles WHERE id = ${resumeRow.candidate_id} LIMIT 1
      `
    : [undefined];
  const [ingestRow] = await sql<IngestJobRow[]>`
    SELECT * FROM ingest_jobs
    WHERE resume_id = ${resumeId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return {
    resume: mapResume(resumeRow),
    candidate: candidateRow ? mapCandidate(candidateRow) : null,
    ingestJob: ingestRow ? mapIngest(ingestRow) : null,
  };
}

export const postgresRepository: AppRepository = {
  async getDashboardSnapshot() {
    const sql = getSqlClient();
    const [resumeCount] = await sql<Row[]>`SELECT COUNT(*)::int AS count FROM resumes`;
    const [jobCount] = await sql<Row[]>`SELECT COUNT(*)::int AS count FROM jobs`;
    const [processedCount] =
      await sql<Row[]>`SELECT COUNT(*)::int AS count FROM resumes WHERE status = 'indexed'`;
    const stageRows = await sql<Row[]>`
      SELECT stage, COUNT(*)::int AS count
      FROM match_results
      GROUP BY stage
    `;

    const candidatesByStage = Object.fromEntries(
      PIPELINE_STAGES.map((stage) => [stage, 0]),
    ) as DashboardSnapshot["candidatesByStage"];

    for (const row of stageRows) {
      if (row.stage in candidatesByStage) {
        candidatesByStage[row.stage as keyof typeof candidatesByStage] = Number(
          row.count,
        );
      }
    }

    return {
      totalResumes: Number(resumeCount?.count ?? 0),
      activeJobs: Number(jobCount?.count ?? 0),
      processedResumes: Number(processedCount?.count ?? 0),
      candidatesByStage,
    };
  },
  async listJobs() {
    const sql = getSqlClient();
    const rows = await sql<JobRow[]>`SELECT * FROM jobs ORDER BY created_at DESC`;
    return rows.map(mapJob);
  },
  async getJob(id) {
    const sql = getSqlClient();
    const [row] = await sql<JobRow[]>`SELECT * FROM jobs WHERE id = ${id} LIMIT 1`;
    return row ? mapJob(row) : null;
  },
  async createJob(input) {
    const sql = getSqlClient();
    const [row] = await sql<JobRow[]>`
      INSERT INTO jobs (id, title, description, keywords, created_at, updated_at)
      VALUES (
        ${crypto.randomUUID()},
        ${input.title},
        ${input.description},
        ${sql.json(input.keywords)},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    return mapJob(row);
  },
  async updateJob(id, input) {
    const sql = getSqlClient();
    const [row] = await sql<JobRow[]>`
      UPDATE jobs
      SET title = ${input.title},
          description = ${input.description},
          keywords = ${sql.json(input.keywords)},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return row ? mapJob(row) : null;
  },
  async deleteJob(id) {
    const sql = getSqlClient();
    await sql`DELETE FROM jobs WHERE id = ${id}`;
  },
  async listResumes() {
    const sql = getSqlClient();
    const rows = await sql<ResumeRow[]>`SELECT * FROM resumes ORDER BY created_at DESC`;
    const bundles = await Promise.all(rows.map((row) => getResumeCandidateBundle(row.id)));
    return bundles.filter(Boolean) as ResumeWithCandidate[];
  },
  async getResume(id) {
    return getResumeCandidateBundle(id);
  },
  async createResume(input) {
    const sql = getSqlClient();
    const resumeId = crypto.randomUUID();
    await sql`
      INSERT INTO resumes (
        id, file_name, mime_type, file_hash, storage_key, download_url,
        status, created_at, updated_at
      )
      VALUES (
        ${resumeId}, ${input.fileName}, ${input.mimeType}, ${input.fileHash},
        ${input.storageKey}, ${input.downloadUrl}, 'uploaded', NOW(), NOW()
      )
    `;
    await sql`
      INSERT INTO ingest_jobs (id, resume_id, status, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${resumeId}, 'uploaded', NOW(), NOW())
    `;
    return (await getResumeCandidateBundle(resumeId))!;
  },
  async deleteResume(id) {
    const sql = getSqlClient();
    const bundle = await getResumeCandidateBundle(id);
    if (!bundle) {
      return null;
    }
    await sql`DELETE FROM resumes WHERE id = ${id}`;

    if (bundle.resume.candidateId) {
      const [candidateUsage] = await sql<Row[]>`
        SELECT COUNT(*)::int AS count
        FROM resumes
        WHERE candidate_id = ${bundle.resume.candidateId}
      `;

      if (Number(candidateUsage?.count ?? 0) === 0) {
        await sql`
          DELETE FROM candidate_profiles
          WHERE id = ${bundle.resume.candidateId}
        `;
      }
    }

    return bundle.resume;
  },
  async updateResume(id, patch) {
    const sql = getSqlClient();
    const [row] = await sql<ResumeRow[]>`
      UPDATE resumes
      SET candidate_id = COALESCE(${patch.candidateId ?? null}, candidate_id),
          status = COALESCE(${patch.status ?? null}, status),
          extracted_text = COALESCE(${patch.extractedText ?? null}, extracted_text),
          ingest_error = ${patch.ingestError ?? null},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return row ? mapResume(row) : null;
  },
  async findResumeByFileHash(fileHash) {
    const sql = getSqlClient();
    const [row] = await sql<ResumeRow[]>`
      SELECT * FROM resumes
      WHERE file_hash = ${fileHash}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return row ? mapResume(row) : null;
  },
  async getLatestIngestJobForResume(resumeId) {
    const sql = getSqlClient();
    const [row] = await sql<IngestJobRow[]>`
      SELECT * FROM ingest_jobs
      WHERE resume_id = ${resumeId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return row ? mapIngest(row) : null;
  },
  async updateIngestJob(id, patch) {
    const sql = getSqlClient();
    const [row] = await sql<IngestJobRow[]>`
      UPDATE ingest_jobs
      SET status = COALESCE(${patch.status ?? null}, status),
          error_message = ${patch.errorMessage ?? null},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return row ? mapIngest(row) : null;
  },
  async findCandidateByIdentity({ fullName, email }) {
    const sql = getSqlClient();
    const rows = await sql<CandidateRow[]>`
      SELECT *
      FROM candidate_profiles
      WHERE LOWER(full_name) = LOWER(${fullName})
         OR (${email ?? ""} <> '' AND LOWER(COALESCE(email, '')) = LOWER(${email ?? ""}))
      LIMIT 1
    `;
    return rows[0] ? mapCandidate(rows[0]) : null;
  },
  async upsertCandidateProfile(input: CandidateProfileInput, existingId?: string) {
    const sql = getSqlClient();
    const id = existingId ?? crypto.randomUUID();
    const [row] = await sql<CandidateRow[]>`
      INSERT INTO candidate_profiles (
        id, full_name, email, skills, years_experience,
        "current_role", location, summary, created_at, updated_at
      )
      VALUES (
        ${id}, ${input.fullName}, ${input.email}, ${sql.json(input.skills)},
        ${input.yearsExperience}, ${input.currentRole}, ${input.location},
        ${input.summary}, NOW(), NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        skills = EXCLUDED.skills,
        years_experience = EXCLUDED.years_experience,
        "current_role" = EXCLUDED."current_role",
        location = EXCLUDED.location,
        summary = EXCLUDED.summary,
        updated_at = NOW()
      RETURNING *
    `;
    return mapCandidate(row);
  },
  async replaceResumeChunks(resumeId, chunks) {
    const sql = getSqlClient();
    await sql`DELETE FROM resume_chunks WHERE resume_id = ${resumeId}`;
    const created: ResumeChunkRecord[] = [];
    for (const chunk of chunks) {
      const [row] = await sql<ChunkRow[]>`
        INSERT INTO resume_chunks (
          id, resume_id, chunk_index, content, token_count, created_at
        )
        VALUES (
          ${crypto.randomUUID()}, ${resumeId}, ${chunk.chunkIndex},
          ${chunk.content}, ${chunk.tokenCount}, NOW()
        )
        RETURNING *
      `;
      created.push(mapChunk(row));
    }
    return created;
  },
  async listResumeChunks(resumeId) {
    const sql = getSqlClient();
    const rows = await sql<ChunkRow[]>`
      SELECT * FROM resume_chunks
      WHERE resume_id = ${resumeId}
      ORDER BY chunk_index ASC
    `;
    return rows.map(mapChunk);
  },
  async getCandidate(id) {
    const sql = getSqlClient();
    const [row] = await sql<CandidateRow[]>`
      SELECT * FROM candidate_profiles WHERE id = ${id} LIMIT 1
    `;
    return row ? mapCandidate(row) : null;
  },
  async replaceMatchResults(jobId, results: MatchResultInsert[]) {
    const sql = getSqlClient();
    await sql`DELETE FROM pipeline_stage_history WHERE job_id = ${jobId}`;
    await sql`DELETE FROM match_results WHERE job_id = ${jobId}`;

    for (const result of results) {
      await sql`
        INSERT INTO match_results (
          id, job_id, candidate_id, resume_id, overall_score, semantic_score,
          keyword_score, profile_score, justification, stage, created_at, updated_at
        )
        VALUES (
          ${crypto.randomUUID()}, ${jobId}, ${result.candidateId}, ${result.resumeId},
          ${result.overallScore}, ${result.semanticScore}, ${result.keywordScore},
          ${result.profileScore}, ${result.justification}, ${result.stage}, NOW(), NOW()
        )
      `;
      await sql`
        INSERT INTO pipeline_stage_history (
          id, job_id, candidate_id, from_stage, to_stage, changed_at
        )
        VALUES (
          ${crypto.randomUUID()}, ${jobId}, ${result.candidateId},
          NULL, ${result.stage}, NOW()
        )
      `;
    }

    return this.listMatches(jobId);
  },
  async listMatches(jobId) {
    const sql = getSqlClient();
    const rows = await sql<MatchRow[]>`
      SELECT * FROM match_results
      WHERE job_id = ${jobId}
      ORDER BY overall_score DESC
    `;
    const views: MatchCandidateView[] = [];
    for (const row of rows) {
      const candidate = await this.getCandidate(row.candidate_id);
      const resumeBundle = await getResumeCandidateBundle(row.resume_id);
      if (candidate && resumeBundle) {
        views.push({
          result: mapMatch(row),
          candidate,
          resume: resumeBundle.resume,
        });
      }
    }
    return views;
  },
  async updateCandidateStage(jobId, candidateId, stage) {
    const sql = getSqlClient();
    const [previous] = await sql<MatchRow[]>`
      SELECT * FROM match_results
      WHERE job_id = ${jobId} AND candidate_id = ${candidateId}
      LIMIT 1
    `;

    if (!previous) {
      return null;
    }

    await sql`
      UPDATE match_results
      SET stage = ${stage}, updated_at = NOW()
      WHERE job_id = ${jobId} AND candidate_id = ${candidateId}
    `;
    await sql`
      INSERT INTO pipeline_stage_history (
        id, job_id, candidate_id, from_stage, to_stage, changed_at
      )
      VALUES (
        ${crypto.randomUUID()}, ${jobId}, ${candidateId},
        ${previous.stage}, ${stage}, NOW()
      )
    `;

    return (await this.listMatches(jobId)).find(
      (item) => item.candidate.id === candidateId,
    )!;
  },
  async listPipelineHistory(jobId) {
    const sql = getSqlClient();
    const rows = await sql<PipelineHistoryRow[]>`
      SELECT * FROM pipeline_stage_history
      WHERE job_id = ${jobId}
      ORDER BY changed_at DESC
    `;
    return rows.map(mapHistory);
  },
};
