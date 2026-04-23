import { NextResponse } from "next/server";
import { CACHE_TAGS, invalidateTags } from "@/lib/server/cached-queries";
import { clearResumeLibrary } from "@/lib/server/services/delete-resume";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") === "all" ? "all" : "attempts";
    const result = await clearResumeLibrary(scope);

    invalidateTags([
      CACHE_TAGS.dashboard,
      CACHE_TAGS.resumes,
      CACHE_TAGS.matches,
      CACHE_TAGS.pipelineHistory,
    ]);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel limpar curriculos.",
      },
      { status: 500 },
    );
  }
}
