import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDemoHouse } from './demoBuild';
import { validateScene } from './validator';

describe('Demo house spec validator', () => {
  it('recomputes measurements within 0.5%', () => {
    const specPath = resolve(process.cwd(), 'docs/metrics.full.json');
    const spec = JSON.parse(readFileSync(specPath, 'utf-8'));
    const metrics = { stories: spec.stories, footprint: { perimeter_ft: spec.footprint.perimeter_ft, area_ft2: spec.footprint.area_ft2 } };
    const built = buildDemoHouse(metrics, spec);
    const res = validateScene(built.group, spec, 0.005);
    const worst = Math.max(0, ...Object.values(res.deltas));
    expect(worst).toBeLessThanOrEqual(0.005);
    expect(res.pass).toBe(true);
  });
});

