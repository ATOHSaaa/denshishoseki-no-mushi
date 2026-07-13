import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { generatePostId } from './lib/post-slug';

const productEntrySchema = z.object({
  asin: z.string().regex(/^[A-Z0-9]{10}$/i),
  label: z.string().optional(),
  note: z.string().optional(),
  price: z.string().optional(),
  referencePrice: z.string().optional(),
  savings: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const productGroupSchema = z.object({
  title: z.string(),
  products: z.array(productEntrySchema).min(1),
});

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/posts',
    generateId: ({ entry, data }) => generatePostId(entry, data),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('電子書籍の虫編集部'),
    category: z.enum(['kindle', 'tips', 'deals', 'app', 'manga']),
    tags: z.array(z.string()).default([]),
    saleEvent: z.string().optional(),
    saleEndDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    thumbnailImage: z.string().optional(),
    thumbnailAsin: z
      .string()
      .regex(/^[A-Z0-9]{10}$/i)
      .optional(),
    featuredProduct: productEntrySchema.optional(),
    products: z.array(productEntrySchema).optional(),
    productGroups: z.array(productGroupSchema).optional(),
  }),
});

export const collections = { posts };
