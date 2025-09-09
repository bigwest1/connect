import { prisma } from "@homegraph/db";

function parseCookie(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(rest.join('=') || '');
  });
  return out;
}

export async function getUserAndHome(req: Request): Promise<{ userId: string; homeId: string }> {
  const cookies = parseCookie(req.headers.get('cookie'));
  const email = cookies['email'] || req.headers.get('x-email') || '';
  if (!email) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Object.assign(new Error('Forbidden'), { status: 403 });
  const member = await prisma.membership.findFirst({ where: { userId: user.id }, orderBy: { role: 'asc' } });
  if (!member) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return { userId: user.id, homeId: member.homeId };
}

export async function ensureDeviceInHome(req: Request, deviceId: string): Promise<string> {
  const { homeId } = await getUserAndHome(req);
  const dev = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!dev || dev.homeId !== homeId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return homeId;
}

