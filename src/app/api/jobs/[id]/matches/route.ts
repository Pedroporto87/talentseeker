import { NextResponse } from "next/server";
import { getRepository } from "@/lib/server/repositories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const matches = await getRepository().listMatches(id);
  return NextResponse.json(matches);
}
