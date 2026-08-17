import { z } from 'astro/zod';

export const nowSchema = z.object({
  updated: z.coerce.date(),
  focus: z.string().min(40).max(280),
  learning: z.array(z.string()).max(3).default([]),
  project: z.string().optional(),
});

export type NowEntry = z.infer<typeof nowSchema>;
