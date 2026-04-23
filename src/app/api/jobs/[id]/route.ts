import { NextResponse } from "next/server";
import { CACHE_TAGS, invalidateTags } from "@/lib/server/cached-queries";
import { getRepository } from "@/lib/server/repositories";
import { jobInputSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsed = jobInputSchema.parse(await request.json());
    const updated = await getRepository().updateJob(id, parsed);

    if (!updated) {
      return NextResponse.json({ error: "Vaga nao encontrada." }, { status: 404 });
    }

    invalidateTags([
      CACHE_TAGS.dashboard,
      CACHE_TAGS.jobs,
      `${CACHE_TAGS.jobs}:${id}`,
    ]);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel atualizar a vaga.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  await getRepository().deleteJob(id);
  invalidateTags([
    CACHE_TAGS.dashboard,
    CACHE_TAGS.jobs,
    CACHE_TAGS.matches,
    CACHE_TAGS.pipelineHistory,
    `${CACHE_TAGS.jobs}:${id}`,
    `${CACHE_TAGS.matches}:${id}`,
    `${CACHE_TAGS.pipelineHistory}:${id}`,
  ]);
  return NextResponse.json({ ok: true });
}
