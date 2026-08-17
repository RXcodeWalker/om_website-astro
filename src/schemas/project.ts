import { z } from 'astro/zod';
import type { SchemaContext } from 'astro:content';
import { link, metric, timelineEntry } from './primitives';

export const projectSchema = ({ image }: SchemaContext) =>
  z
    .object({
      title: z.string().min(1),
      outcome: z.string().max(90),
      summary: z.string().min(80).max(320),
      kicker: z.string().max(40).optional(),

      category: z.enum(['web', 'ai', 'hardware', 'tool']),
      status: z.enum(['shipped', 'in-progress', 'experiment', 'archived']),
      year: z.number().int().min(2020).max(2100),
      timeframe: z.string().optional(),
      role: z.string().default('Designer & developer'),
      collaborators: z.array(z.string()).default([]),
      stack: z.array(z.string()).min(1).max(8),

      order: z.number().int(),
      draft: z.boolean().default(false),

      thumbnail: z.object({ src: image(), alt: z.string().min(4) }),
      hero: z.object({ src: image(), alt: z.string().min(4) }).optional(),

      metrics: z.array(metric).max(4).default([]),
      journey: z.array(timelineEntry).default([]),
      specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),

      links: z.array(link).default([]),
      linksNote: z.string().optional(),
      achievement: z.string().optional(),
      relatedPost: z.object({ title: z.string(), url: z.string().url() }).optional(),

      description: z.string().max(160).optional(),
    })
    .refine((p) => p.links.length > 0 || Boolean(p.linksNote), {
      message: 'A project needs at least one link, or linksNote explaining why nothing is public.',
      path: ['links'],
    });
