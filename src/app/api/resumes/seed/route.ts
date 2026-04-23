import { NextResponse } from "next/server";
import { CACHE_TAGS, invalidateTags } from "@/lib/server/cached-queries";
import { seedDemoResumes } from "@/lib/server/services/seed-demo-resumes";

export async function POST() {
  try {
    const result = await seedDemoResumes({
      replaceExisting: true,
    });

    invalidateTags([
      CACHE_TAGS.dashboard,
      CACHE_TAGS.jobs,
      CACHE_TAGS.resumes,
      CACHE_TAGS.matches,
      CACHE_TAGS.pipelineHistory,
    ]);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel gerar a base demo.",
      },
      { status: 500 },
    );
  }
}
