import { NextResponse } from "next/server";
import { prisma } from "@homegraph/db";
import { ensureDeviceInHome } from "../../../../../lib/serverScope";

export async function GET(req: Request, { params }: { params: { deviceId: string } }) {
  await ensureDeviceInHome(req, params.deviceId);
  const row = await prisma.deviceState.findUnique({ where: { deviceId: params.deviceId } });
  const json = row?.json ?? "{}";
  return NextResponse.json(JSON.parse(json));
}

export async function POST(req: Request, { params }: { params: { deviceId: string } }) {
  await ensureDeviceInHome(req, params.deviceId);
  const body = await req.json();
  await prisma.deviceState.upsert({
    where: { deviceId: params.deviceId },
    update: { json: JSON.stringify(body ?? {}) },
    create: { deviceId: params.deviceId, json: JSON.stringify(body ?? {}) }
  });
  return NextResponse.json({ ok: true });
}
