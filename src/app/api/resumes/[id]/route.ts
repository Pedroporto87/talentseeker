import { NextResponse } from "next/server";
import { deleteResumeAndAssets } from "@/lib/server/services/delete-resume";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const deleted = await deleteResumeAndAssets(id);

  if (!deleted) {
    return NextResponse.json(
      { error: "Curriculo nao encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
