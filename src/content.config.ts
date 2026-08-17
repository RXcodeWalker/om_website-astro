import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';
import { projectSchema } from './schemas/project';
import { achievementSchema } from './schemas/achievement';
import { nowSchema } from './schemas/now';
import { writingPickSchema } from './schemas/writing';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    category: z.string(),
    excerpt: z.string(),
    id: z.string().optional(),
    featured: z.boolean().optional(),
    link: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional().default('Om Jhamvar'),
    image: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/index.mdx', base: './src/content/projects' }),
  schema: projectSchema,
});

const achievements = defineCollection({
  loader: file('src/data/achievements.yaml'),
  schema: achievementSchema,
});

const now = defineCollection({
  loader: file('src/data/now.yaml'),
  schema: nowSchema,
});

const writing = defineCollection({
  loader: file('src/data/writing.yaml'),
  schema: writingPickSchema,
});

export const collections = { blog, projects, achievements, now, writing };
