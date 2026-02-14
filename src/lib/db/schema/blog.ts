import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { blogStatusEnum } from './enums';

export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  content: text('content').notNull().default(''),
  excerpt: text('excerpt').notNull().default(''),
  category: text('category').notNull().default('News'),
  tags: jsonb('tags').notNull().default([]),
  status: blogStatusEnum('status').notNull().default('draft'),
  featuredImage: text('featured_image'),
  authorId: uuid('author_id'),
  authorName: text('author_name'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: uuid('updated_by'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  viewCount: integer('view_count').notNull().default(0),
});

export const blogCategories = pgTable('blog_categories', {
  name: text('name').primaryKey(),
});

export const blogSettings = pgTable('blog_settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});
