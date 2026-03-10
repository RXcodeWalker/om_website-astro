import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    category: z.string(),
    excerpt: z.string(),
    id: z.string().optional(), // We'll use the filename as the slug, but keeping ID for compatibility
    featured: z.boolean().optional(),
    link: z.string().optional(),
  }),
});

export const collections = { blog };
