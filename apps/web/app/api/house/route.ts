import { NextResponse } from "next/server";
import { prisma } from "@homegraph/db";
import { ensureCanEditGeometry } from "../../../lib/auth";
import { getUserAndHome } from "../../../lib/serverScope";
import { HouseSpecSchema } from "../../../lib/specSchema";

export async function GET(req: Request) {
  const { homeId } = await getUserAndHome(req);
  const home = await prisma.home.findUnique({ where: { id: homeId } });
  const raw = home?.metricsJson ?? "{}";
  let out: any = {};
  try { out = JSON.parse(raw); } catch { out = {}; }
  // If empty, try to load canonical demo spec from public docs
  if (!out || !out.footprint || typeof out.footprint.area_ft2 !== 'number' || out.footprint.area_ft2 <= 0) {
    try {
      const proto = (req.headers.get('x-forwarded-proto') || 'https');
      const host = (req.headers.get('x-forwarded-host') || req.headers.get('host'));
      if (host) {
        const base = `${proto}://${host}`;
        const urls = [`${base}/docs/metrics.full.json`, `${base}/docs/metrics.json`];
        for (const u of urls) {
          const res = await fetch(u, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const parsed = HouseSpecSchema.safeParse(json);
            if (parsed.success) { out = parsed.data; break; }
          }
        }
      }
    } catch {}
  }
  return NextResponse.json(out || {});
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
