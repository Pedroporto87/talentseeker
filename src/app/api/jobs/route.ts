import { NextResponse } from "next/server";
import { CACHE_TAGS, invalidateTags } from "@/lib/server/cached-queries";
import { getRepository } from "@/lib/server/repositories";
import { jobInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = jobInputSchema.parse(await request.json());
    const created = await getRepository().createJob(parsed);
    invalidateTags([CACHE_TAGS.dashboard, CACHE_TAGS.jobs]);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nao foi possivel criar a vaga.",
      },
      { status: 400 },
    );
  }
}
