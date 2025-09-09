// Lightweight civil dawn/dusk calculator using NOAA algorithm
// Returns local times (hours 0..24) for dawn, dusk given a date and lat/lon

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function dayOfYear(d: Date) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function toLocalHours(utcHours: number, date: Date) {
  const offsetHours = -date.getTimezoneOffset() / 60;
  let h = utcHours + offsetHours;
  while (h < 0) h += 24;
  while (h >= 24) h -= 24;
  return h;
}

// Based on NOAA solar calculations; zenith 96° for civil twilight
export function civilDawnDusk(date: Date, lat = 44.9778, lon = -93.2650): { dawn: number; dusk: number } {
  const zenith = 96 * DEG2RAD; // 96°
  const N = dayOfYear(date);
  const lngHour = lon / 15;

  function calc(isSunrise: boolean) {
    const t = N + ((isSunrise ? 6 : 18) - lngHour) / 24; // approx time
    const M = 0.9856 * t - 3.289; // mean anomaly
    let L = M + 1.916 * Math.sin(M * DEG2RAD) + 0.020 * Math.sin(2 * M * DEG2RAD) + 282.634; // true long
    L = ((L % 360) + 360) % 360;
    const RA = Math.atan(0.91764 * Math.tan(L * DEG2RAD)) * RAD2DEG;
    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    const RAcorr = (RA + (Lquadrant - RAquadrant)) / 15; // hours

    const sinDec = 0.39782 * Math.sin(L * DEG2RAD);
    const cosDec = Math.cos(Math.asin(sinDec));

    const cosH = (Math.cos(zenith) - sinDec * Math.sin(lat * DEG2RAD)) / (cosDec * Math.cos(lat * DEG2RAD));
    if (cosH > 1 || cosH < -1) {
      // Polar day/night: fall back to typical 6am/6pm
      return isSunrise ? 6 : 18;
    }

    const H = (isSunrise ? 360 - Math.acos(cosH) * RAD2DEG : Math.acos(cosH) * RAD2DEG) / 15;
    const T = H + RAcorr - 0.06571 * t - 6.622; // local mean time (hours)
    const UT = (T - lngHour + 24) % 24;
    return UT;
  }

  const dawnUTC = calc(true);
  const duskUTC = calc(false);
  return { dawn: toLocalHours(dawnUTC, date), dusk: toLocalHours(duskUTC, date) };
}

