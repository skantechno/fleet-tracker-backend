import { z } from 'zod';

export const vehicleStatusSchema = z.enum([
  'active',
  'idle',
  'offline',
  'maintenance',
]);

export const telemetrySchema = z.object({
  vehicleId: z.string().min(1),
  timestamp: z.string().datetime(),
  lat: z.number(),
  lng: z.number(),
  speed: z.number(),
  fuel: z.number(),
  status: vehicleStatusSchema,
});

export const statusSchema = z.object({
  vehicleId: z.string().min(1),
  status: vehicleStatusSchema,
  timestamp: z.string().datetime(),
});

export type TelemetryMessage = z.infer<typeof telemetrySchema>;
export type StatusMessage = z.infer<typeof statusSchema>;
