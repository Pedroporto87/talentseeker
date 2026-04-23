import { NextResponse } from "next/server";
import { runJobMatch } from "@/lib/server/services/run-match";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const matches = await runJobMatch(id);
    return NextResponse.json(matches);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao executar matching.",
      },
      { status: 500 },
    );
  }
}
