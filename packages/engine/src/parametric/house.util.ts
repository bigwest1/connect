export type SeedMetrics = {
  stories: number;
  footprint: { perimeter_ft: number; area_ft2: number };
};

export function computeSeed(metrics: SeedMetrics) {
  const area = metrics.footprint.area_ft2; // very rough scale
  const size = Math.sqrt(area) / 10; // arbitrary scale for demo
  const height = 2.8 * metrics.stories; // meters-ish
  return { size, height };
}

