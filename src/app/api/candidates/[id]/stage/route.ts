import { NextResponse } from "next/server";
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
        { error: "Candidato não encontrado no pipeline." },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao atualizar estágio.",
      },
      { status: 400 },
    );
  }
}
