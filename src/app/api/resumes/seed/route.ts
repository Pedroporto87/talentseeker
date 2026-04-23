import { NextResponse } from "next/server";
import { seedDemoResumes } from "@/lib/server/services/seed-demo-resumes";

export async function POST() {
  try {
    const result = await seedDemoResumes({
      replaceExisting: true,
    });

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
