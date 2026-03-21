import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.string(),
    category: z.string(),
    excerpt: z.string(),
    id: z.string().optional(),
    featured: z.boolean().optional(),
    link: z.string().optional(),
    // ADD THESE:
    tags: z.array(z.string()).optional(),
    author: z.string().optional().default("Om Jhamvar"),
    image: z.string().optional(), // relative path to og image
  }),
});

export const collections = { blog };
