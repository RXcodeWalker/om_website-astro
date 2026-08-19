import { z } from 'astro/zod';

export const nowSchema = z.object({
  updated: z.coerce.date(),
  focus: z.string().min(40).max(280),
  strands: z
    .array(
      z.object({
        label: z.string().min(1),
        title: z.string().min(1),
        detail: z.string().min(20).max(320),
      }),
    )
    .max(3)
    .default([]),
  project: z.string().optional(),
});

export type NowEntry = z.infer<typeof nowSchema>;
