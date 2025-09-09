import { z } from "zod";

const CRON_PART = /^(\*|\d{1,2}|(\d{1,2}-\d{1,2})(\/\d{1,2})?|(\d{1,2})(,\d{1,2})+)(\/\d{1,2})?$/;

export const cronExpr = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.split(/\s+/).length === 5, { message: "Cron must have 5 fields" })
  .refine((s) => s.split(/\s+/).every((p) => CRON_PART.test(p)), { message: "Invalid cron field" });

export const whenSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cron"), cron: cronExpr }),
  z.object({ type: z.literal("sun"), event: z.enum(["sunrise", "sunset"]), offsetMin: z.number().int().min(-360).max(360).default(0) })
]);

export const scheduleAction = z.object({
  on: z.boolean().optional(),
  brightness: z.number().min(0).max(1).optional(),
  colorRGB: z.string().regex(/^#?[0-9A-Fa-f]{6}$/).optional(),
  tempSetpoint: z.number().min(30).max(100).optional(),
  open: z.number().min(0).max(1).optional(),
  sprinkle: z.number().min(0).max(1).optional(),
  pan: z.number().min(-1).max(1).optional(),
  tilt: z.number().min(-1).max(1).optional(),
  scene: z.string().optional()
}).refine((v) => Object.keys(v).length > 0, { message: "Action must set at least one field" });

export const scheduleRule = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  enabled: z.boolean().default(true),
  when: whenSchema,
  action: scheduleAction
});

export type ScheduleRule = z.infer<typeof scheduleRule>;

export function parseSchedules(json: unknown): ScheduleRule[] {
  const arr = z.array(scheduleRule).safeParse(json);
  if (!arr.success) throw arr.error;
  return arr.data;
}

// ---- Evaluation utilities ----

function parsePart(part: string, min: number, max: number): (v: number) => boolean {
  if (part === "*") return () => true;
  const options = new Set<number>();
  const chunks = part.split(",");
  for (const c of chunks) {
    if (c.includes("/")) {
      const [base, stepStr] = c.split("/");
      const step = parseInt(stepStr || "1", 10) || 1;
      const [a, b] = base.includes("-") ? base.split("-").map((x) => parseInt(x, 10)) : [min, max];
      for (let v = a; v <= b; v += step) options.add(v);
    } else if (c.includes("-")) {
      const [a, b] = c.split("-").map((x) => parseInt(x, 10));
      for (let v = a; v <= b; v++) options.add(v);
    } else {
      const v = parseInt(c, 10);
      if (!Number.isNaN(v)) options.add(v);
    }
  }
  return (v: number) => options.has(v);
}

function sunriseSunset(date: Date, lat = 45, lon = -93): { sunrise: number; sunset: number } {
  const DEG2RAD = Math.PI / 180; const RAD2DEG = 180 / Math.PI;
  const zenith = 90.833 * DEG2RAD; // official
  const dayOfYear = (d: Date) => Math.floor((+d - +new Date(d.getFullYear(), 0, 0)) / 86400000);
  const N = dayOfYear(date);
  const lngHour = lon / 15;
  function calc(isRise: boolean) {
    const t = N + ((isRise ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(M * DEG2RAD) + 0.020 * Math.sin(2 * M * DEG2RAD) + 282.634; L = ((L % 360) + 360) % 360;
    const RA = Math.atan(0.91764 * Math.tan(L * DEG2RAD)) * RAD2DEG;
    const Lq = Math.floor(L / 90) * 90; const RAq = Math.floor(RA / 90) * 90; const RAh = (RA + (Lq - RAq)) / 15;
    const sinDec = 0.39782 * Math.sin(L * DEG2RAD); const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(zenith) - sinDec * Math.sin(lat * DEG2RAD)) / (cosDec * Math.cos(lat * DEG2RAD));
    const Hh = (isRise ? 360 - Math.acos(cosH) * RAD2DEG : Math.acos(cosH) * RAD2DEG) / 15;
    const T = Hh + RAh - 0.06571 * t - 6.622; const UT = (T - lngHour + 24) % 24; return UT;
  }
  const toLocal = (h: number) => (h - new Date().getTimezoneOffset() / 60 + 24) % 24;
  return { sunrise: toLocal(calc(true)), sunset: toLocal(calc(false)) };
}

export function computeNextRun(rule: ScheduleRule, opts?: { now?: Date; lat?: number; lon?: number }): Date | null {
  const now = opts?.now ?? new Date();
  let cursor = new Date(now.getTime() + 60000); // start next minute
  cursor.setSeconds(0, 0);
  const end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 366);
  if (rule.when.type === "sun") {
    for (let i = 0; i < 400; i++) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i);
      const ss = sunriseSunset(d, opts?.lat, opts?.lon);
      const base = rule.when.event === "sunrise" ? ss.sunrise : ss.sunset;
      const hr = Math.floor(base);
      const min = Math.floor((base % 1) * 60) + (rule.when.offsetMin ?? 0);
      const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hr, min, 0, 0);
      if (dt > now) return dt;
    }
    return null;
  }
  // cron
  const [m, h, dom, mon, dow] = rule.when.cron.split(/\s+/);
  const M = parsePart(m, 0, 59); const H = parsePart(h, 0, 23); const D = parsePart(dom, 1, 31); const MO = parsePart(mon, 1, 12); const DW = parsePart(dow, 0, 6);
  while (cursor <= end) {
    if (M(cursor.getMinutes()) && H(cursor.getHours()) && D(cursor.getDate()) && MO(cursor.getMonth() + 1) && DW(cursor.getDay())) return cursor;
    cursor = new Date(cursor.getTime() + 60000);
  }
  return null;
}

