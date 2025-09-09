export type Door = { w_in: number; h_in: number };

export type HouseSpec = {
  stories: number;
  footprint: { perimeter_ft: number; area_ft2: number };
  sidingByElevation_ft2?: { front?: number; right?: number; left?: number; back?: number; total?: number };
  brick_ft2?: number;
  openings?: {
    total_ft2?: number;
    doors?: Door[];
    windows_total_ft2?: number;
    windows_united_inches?: number;
  };
  roof?: { area_ft2?: number; pitch?: string; eaves_ft?: number };
  soffit_area_ft2?: number;
};
