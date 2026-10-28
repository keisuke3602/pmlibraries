import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    modified: z.coerce.date().optional(),
    permalink: z.string(),
    categories: z.array(z.object({ name: z.string(), slug: z.string() })).default([]),
    tags: z.array(z.object({ name: z.string(), slug: z.string() })).default([]),
    image: z.string().optional(),
    excerpt: z.string().default(''),
    wpId: z.number().optional(),
    comments: z
      .array(z.object({ author: z.string(), date: z.coerce.date(), body: z.string() }))
      .default([]),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    permalink: z.string(),
    image: z.string().optional(),
    wpId: z.number().optional(),
  }),
});

export const collections = { posts, pages };
