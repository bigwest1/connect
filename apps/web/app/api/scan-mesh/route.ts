import { NextResponse } from "next/server";
import { prisma } from "@homegraph/db";
import { getUserAndHome } from "../../../lib/serverScope";
import crypto from "node:crypto";

function badRequest(msg: string) { return NextResponse.json({ ok: false, error: msg }, { status: 400 }); }

function requireAck(req: Request, header: string) {
  const h = (req.headers.get(header) || '').toLowerCase();
  if (h !== 'yes' && h !== 'true' && h !== '1') throw Object.assign(new Error('Missing opt-in'), { status: 400 });
}

function encryptAESGCM(keyB64: string, dataB64: string) {
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) throw new Error('Key must be 32 bytes (base64)');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(dataB64, 'base64')), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${ciphertext.toString('base64')}.${tag.toString('base64')}`;
}

export async function GET(req: Request) {
  const { homeId } = await getUserAndHome(req);
  // List metadata only
  const list = await prisma.scanMesh.findMany({ where: { homeId }, select: { id: true, name: true, mime: true, createdAt: true } });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  try {
    requireAck(req, 'x-ack-import-risk');
    const { homeId } = await getUserAndHome(req);
    const body = await req.json() as { name?: string; mime?: string; contentBase64?: string; keyBase64?: string };
    if (!body?.contentBase64 || !body?.keyBase64) return badRequest('Missing contentBase64 or keyBase64');
    const name = body.name || 'scan.glb';
    const mime = body.mime || 'model/gltf-binary';
    const payload = encryptAESGCM(body.keyBase64, body.contentBase64);
    const row = await prisma.scanMesh.create({ data: { homeId, name, mime, data: payload } });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e: any) {
    const status = e?.status ?? 400;
    return NextResponse.json({ ok: false, error: e?.message ?? 'Invalid' }, { status });
  }
}

