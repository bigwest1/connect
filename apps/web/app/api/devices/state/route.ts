import { NextResponse } from "next/server";
import { prisma } from "@homegraph/db";
import { getUserAndHome } from "../../../../lib/serverScope";

export async function GET(req: Request) {
  const { homeId } = await getUserAndHome(req);
  const devices = await prisma.device.findMany({ where: { homeId }, select: { id: true } });
  const ids = devices.map((d: { id: string }) => d.id);
  if (ids.length === 0) return NextResponse.json({});
  const rows = await prisma.deviceState.findMany({ where: { deviceId: { in: ids } } });
  const out: Record<string, any> = {};
  for (const r of rows) out[r.deviceId] = JSON.parse(r.json);
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  const { homeId } = await getUserAndHome(req);
  const body = (await req.json()) as { states: Record<string, any> };
  const states = body?.states ?? {};
  const entries = Object.entries(states);
  // Validate devices belong to home
  const ids = entries.map(([id]) => id);
  const devs = await prisma.device.findMany({ where: { id: { in: ids } }, select: { id: true, homeId: true } });
  const valid = new Set(devs.filter((d: { homeId: string }) => d.homeId === homeId).map((d: { id: string }) => d.id));
  for (const [deviceId, json] of entries) {
    if (!valid.has(deviceId)) throw NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }) as any;
    await prisma.deviceState.upsert({
      where: { deviceId },
      update: { json: JSON.stringify(json ?? {}) },
      create: { deviceId, json: JSON.stringify(json ?? {}) }
    });
  }
  return NextResponse.json({ ok: true, count: entries.length });
}
