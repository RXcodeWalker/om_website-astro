import { z } from 'astro/zod';

/** Every outbound link on the site, including socials and evidence links. */
export const link = z.object({
  label: z.string().min(1),
  href: z.string().url(),
  kind: z
    .enum(['repo', 'live', 'demo', 'writeup', 'video', 'download', 'profile', 'certificate'])
    .default('live'),
});

/** One dated moment. Used by project journeys and the optional About timeline. */
export const timelineEntry = z.object({
  date: z.coerce.date(),
  end: z.coerce.date().optional(),
  title: z.string().min(1),
  detail: z.string().optional(),
});

/** A verifiable number. `note` exists so a figure can never appear unsourced. */
export const metric = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  note: z.string().optional(),
});

export type Link = z.infer<typeof link>;
export type TimelineEntry = z.infer<typeof timelineEntry>;
export type Metric = z.infer<typeof metric>;
