import { NextResponse } from "next/server";
import { CACHE_TAGS, invalidateTags } from "@/lib/server/cached-queries";
import { getRepository } from "@/lib/server/repositories";
import { updateStageSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsed = updateStageSchema.parse(await request.json());
    const updated = await getRepository().updateCandidateStage(
      parsed.jobId,
      id,
      parsed.stage,
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Candidato nao encontrado no pipeline." },
        { status: 404 },
      );
    }

    invalidateTags([
      CACHE_TAGS.dashboard,
      CACHE_TAGS.matches,
      CACHE_TAGS.pipelineHistory,
      `${CACHE_TAGS.matches}:${parsed.jobId}`,
      `${CACHE_TAGS.pipelineHistory}:${parsed.jobId}`,
    ]);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao atualizar estagio.",
      },
      { status: 400 },
    );
  }
}
