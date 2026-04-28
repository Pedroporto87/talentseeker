import { NextResponse } from "next/server";
import { CACHE_TAGS, invalidateTags } from "@/lib/server/cached-queries";
import { deleteResumeAndAssets } from "@/lib/server/services/delete-resume";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteResumeAndAssets(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Curriculo nao encontrado." },
        { status: 404 },
      );
    }

    invalidateTags([
      CACHE_TAGS.dashboard,
      CACHE_TAGS.resumes,
      CACHE_TAGS.matches,
      CACHE_TAGS.pipelineHistory,
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel excluir o curriculo.",
      },
      { status: 500 },
    );
  }
}
