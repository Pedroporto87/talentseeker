import { NextResponse } from "next/server";
import { clearResumeLibrary } from "@/lib/server/services/delete-resume";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") === "all" ? "all" : "attempts";
    const result = await clearResumeLibrary(scope);

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
