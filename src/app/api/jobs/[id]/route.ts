import { NextResponse } from "next/server";
import { jobInputSchema } from "@/lib/validation";
import { getRepository } from "@/lib/server/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsed = jobInputSchema.parse(await request.json());
    const updated = await getRepository().updateJob(id, parsed);

    if (!updated) {
      return NextResponse.json({ error: "Vaga não encontrada." }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Não foi possível atualizar a vaga.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  await getRepository().deleteJob(id);
  return NextResponse.json({ ok: true });
}
