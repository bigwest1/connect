import { NextResponse } from "next/server";
import { prisma } from "@homegraph/db";
import { ensureCanEditGeometry } from "../../../lib/auth";
import { getUserAndHome } from "../../../lib/serverScope";

export async function GET(req: Request) {
  const { homeId } = await getUserAndHome(req);
  const home = await prisma.home.findUnique({ where: { id: homeId } });
  const json = home?.metricsJson ?? "{}";
  return NextResponse.json(JSON.parse(json));
}

export async function POST(req: Request) {
  try {
    ensureCanEditGeometry(req);
    const { homeId } = await getUserAndHome(req);
    const body = await req.json();
    await prisma.home.update({ where: { id: homeId }, data: { metricsJson: JSON.stringify(body ?? {}) } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e?.status ?? 400;
    return NextResponse.json({ ok: false, error: e?.message ?? 'Invalid' }, { status });
  }
}
