import { z } from 'astro/zod';
import { link } from './primitives';

export const achievementSchema = z.object({
  title: z.string().min(1),
  issuer: z.string().min(1),
  date: z.coerce.date(),
  domain: z.enum(['academics', 'music', 'sport', 'leadership', 'building']),
  credential: z.string().optional(),
  significance: z.string().min(40).max(220),
  highlight: z.boolean().default(false),
  evidence: z.array(link).default([]),
  project: z.string().optional(),
});

export type Achievement = z.infer<typeof achievementSchema>;
