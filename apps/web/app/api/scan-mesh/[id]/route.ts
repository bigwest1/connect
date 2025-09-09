import { NextResponse } from "next/server";
import { prisma } from "@homegraph/db";
import { getUserAndHome } from "../../../../lib/serverScope";
import crypto from "node:crypto";

function requireAck(req: Request, header: string) {
  const h = (req.headers.get(header) || '').toLowerCase();
  if (h !== 'yes' && h !== 'true' && h !== '1') throw Object.assign(new Error('Missing opt-in'), { status: 400 });
}

function decryptAESGCM(keyB64: string, payload: string) {
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) throw new Error('Key must be 32 bytes (base64)');
  const [ivB64, ctB64, tagB64] = payload.split('.');
  if (!ivB64 || !ctB64 || !tagB64) throw new Error('Invalid payload');
  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { homeId } = await getUserAndHome(req);
    requireAck(req, 'x-ack-export-risk');
    const url = new URL(req.url);
    const key = url.searchParams.get('key') || '';
    const raw = url.searchParams.get('raw') || '';
    const row = await prisma.scanMesh.findUnique({ where: { id: params.id } });
    if (!row || row.homeId !== homeId) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    if (raw) {
      // return encrypted payload
      return new NextResponse(row.data, { status: 200, headers: { 'content-type': 'text/plain' } });
    }
    if (!key) return NextResponse.json({ ok: false, error: 'Missing key' }, { status: 400 });
    const plain = decryptAESGCM(key, row.data);
    return new NextResponse(plain, { status: 200, headers: { 'content-type': row.mime, 'content-disposition': `attachment; filename="${row.name}"` } });
  } catch (e: any) {
    const status = e?.status ?? 400;
    return NextResponse.json({ ok: false, error: e?.message ?? 'Invalid' }, { status });
  }
}

