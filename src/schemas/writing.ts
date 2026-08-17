import { z } from 'astro/zod';

export const writingPickSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  date: z.coerce.date(),
  excerpt: z.string().min(60).max(240),
  why: z.string().max(120).optional(),
});

export type WritingPick = z.infer<typeof writingPickSchema>;
