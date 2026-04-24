import { NextResponse } from "next/server";
import { CACHE_TAGS, invalidateTags } from "@/lib/server/cached-queries";
import { MatchValidationError, runJobMatch } from "@/lib/server/services/run-match";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const matches = await runJobMatch(id);
    invalidateTags([
      CACHE_TAGS.dashboard,
      CACHE_TAGS.matches,
      CACHE_TAGS.pipelineHistory,
      `${CACHE_TAGS.matches}:${id}`,
      `${CACHE_TAGS.pipelineHistory}:${id}`,
    ]);
    return NextResponse.json(matches);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao executar matching.",
      },
      { status: error instanceof MatchValidationError ? 400 : 500 },
    );
  }
}
