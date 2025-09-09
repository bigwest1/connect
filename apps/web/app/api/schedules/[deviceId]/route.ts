import { NextResponse } from "next/server";
import { prisma } from "@homegraph/db";
import { parseSchedules } from "@homegraph/devices";
import { ensureCanEditSchedules } from "../../../../lib/auth";
import { ensureDeviceInHome } from "../../../../lib/serverScope";

export async function GET(req: Request, { params }: { params: { deviceId: string } }) {
  await ensureDeviceInHome(req, params.deviceId);
  const row = await prisma.deviceSchedule.findUnique({ where: { deviceId: params.deviceId } });
  const json = row?.json ?? "[]";
  return NextResponse.json(JSON.parse(json));
}

export async function POST(req: Request, { params }: { params: { deviceId: string } }) {
  try {
    ensureCanEditSchedules(req);
    await ensureDeviceInHome(req, params.deviceId);
    const body = await req.json();
    const rules = parseSchedules(body);
    await prisma.deviceSchedule.upsert({
      where: { deviceId: params.deviceId },
      update: { json: JSON.stringify(rules) },
      create: { deviceId: params.deviceId, json: JSON.stringify(rules) }
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Invalid" }, { status: 400 });
  }
}
