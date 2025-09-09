import { z } from "zod";
import type { Capability, DeviceSchema, DeviceType } from "@homegraph/shared";

export const deviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.custom<DeviceType>(),
  roomId: z.string().optional(),
  position3D: z.tuple([z.number(), z.number(), z.number()]).optional(),
  orientation: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  groupIds: z.array(z.string()).optional(),
  capabilities: z.array(z.custom<Capability>()),
  state: z.record(z.any()).and(z.object({ on: z.boolean().optional(), brightness: z.number().optional() })),
  scenes: z.array(z.string()).optional()
});

export type Device = z.infer<typeof deviceSchema> & {
  actions: {
    toggle: () => void;
    select: () => void;
  };
  icon?: string;
  position?: [number, number];
};

