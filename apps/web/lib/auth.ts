export type Role = 'OWNER' | 'FAMILY' | 'GUEST' | 'INSTALLER';

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

export function getRole(req: Request): Role {
  try {
    // Prefer cookie-based role; fallback to header for debugging
    const cookies = parseCookie(req.headers.get('cookie'));
    const cookieRole = (cookies['role'] || cookies['Role'] || '').toUpperCase();
    const headerRole = (req.headers.get('x-role') || req.headers.get('X-Role') || '').toUpperCase();
    const val = cookieRole || headerRole;
    if (val === 'OWNER' || val === 'FAMILY' || val === 'GUEST' || val === 'INSTALLER') return val as Role;
  } catch {}
  return 'GUEST';
}

export function ensureCanEditSchedules(req: Request) {
  const role = getRole(req);
  // Owners and Family can edit schedules; Installer and Guest cannot
  if (role !== 'OWNER' && role !== 'FAMILY') {
    const err: any = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
}

export function ensureCanEditGeometry(req: Request) {
  const role = getRole(req);
  // Owners, Family, and Installer can edit geometry; Guest cannot
  if (role === 'GUEST') {
    const err: any = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
}

// Client-side helpers
export function getClientRole(): Role {
  if (typeof document === 'undefined') return 'GUEST';
  try {
    const cookie = document.cookie || '';
    const cookies = parseCookie(cookie);
    const val = (cookies['role'] || cookies['Role'] || '').toUpperCase();
    if (val === 'OWNER' || val === 'FAMILY' || val === 'GUEST' || val === 'INSTALLER') return val as Role;
  } catch {}
  return 'GUEST';
}
