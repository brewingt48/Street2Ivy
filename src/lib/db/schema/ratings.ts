import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * corporate_ratings — Public ratings that students give to corporate partners.
 * Visible on corporate public profiles.
 */
export const corporateRatings = pgTable('corporate_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull(),
  studentId: uuid('student_id').notNull(),
  corporateId: uuid('corporate_id').notNull(),
  listingId: uuid('listing_id'),
  projectTitle: text('project_title'),
  rating: integer('rating').notNull(),
  reviewText: text('review_text'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * student_ratings — Private ratings that corporate partners give to students.
 * Only visible to the student and their educational admin.
 */
export const studentRatings = pgTable('student_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull(),
  studentId: uuid('student_id').notNull(),
  corporateId: uuid('corporate_id').notNull(),
  listingId: uuid('listing_id'),
  projectTitle: text('project_title'),
  rating: integer('rating').notNull(),
  reviewText: text('review_text'),
  strengths: text('strengths'),
  areasForImprovement: text('areas_for_improvement'),
  recommendForFuture: boolean('recommend_for_future').default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
