import { z } from 'zod';

export const DoorSchema = z.object({
  w_in: z.number().nonnegative(),
  h_in: z.number().nonnegative()
});

export const HouseSpecSchema = z.object({
  stories: z.number().int().positive(),
  footprint: z.object({
    perimeter_ft: z.number().positive(),
    area_ft2: z.number().positive()
  }),
  sidingByElevation_ft2: z.object({
    front: z.number().nonnegative(),
    right: z.number().nonnegative(),
    left: z.number().nonnegative(),
    back: z.number().nonnegative(),
    total: z.number().nonnegative()
  }).partial({ total: true }).optional(),
  brick_ft2: z.number().nonnegative().optional(),
  openings: z.object({
    total_ft2: z.number().nonnegative().optional(),
    doors: z.array(DoorSchema).optional(),
    windows_total_ft2: z.number().nonnegative().optional(),
    windows_united_inches: z.number().nonnegative().optional()
  }).optional(),
  roof: z.object({
    area_ft2: z.number().nonnegative().optional(),
    pitch: z.string().optional(),
    eaves_ft: z.number().nonnegative().optional()
  }).optional(),
  soffit_area_ft2: z.number().nonnegative().optional()
}).passthrough();
