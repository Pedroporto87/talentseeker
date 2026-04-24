import { NextResponse } from "next/server";
import { CACHE_TAGS, invalidateTags } from "@/lib/server/cached-queries";
import { MatchValidationError, runJobMatch } from "@/lib/server/services/run-match";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    console.log("[api/jobs/:id/match] started", { jobId: id });
    const matches = await runJobMatch(id);
    invalidateTags([
      CACHE_TAGS.dashboard,
      CACHE_TAGS.matches,
      CACHE_TAGS.pipelineHistory,
      `${CACHE_TAGS.matches}:${id}`,
      `${CACHE_TAGS.pipelineHistory}:${id}`,
    ]);
    console.log("[api/jobs/:id/match] completed", {
      jobId: id,
      matches: matches.length,
    });
    return NextResponse.json(matches);
  } catch (error) {
    console.error("[api/jobs/:id/match] failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao executar matching.",
      },
      { status: error instanceof MatchValidationError ? 400 : 500 },
    );
  }
}
