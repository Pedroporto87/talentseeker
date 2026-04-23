import { NextResponse } from "next/server";
import { jobInputSchema } from "@/lib/validation";
import { getRepository } from "@/lib/server/repositories";

export async function POST(request: Request) {
  try {
    const parsed = jobInputSchema.parse(await request.json());
    const created = await getRepository().createJob(parsed);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Não foi possível criar a vaga.",
      },
      { status: 400 },
    );
  }
}
