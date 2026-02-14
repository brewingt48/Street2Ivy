import {
  pgTable,
  uuid,
  text,
  boolean,
  real,
  serial,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

export const assessments = pgTable('assessments', {
  id: serial('id').primaryKey(),
  assessmentId: uuid('assessment_id').unique().notNull().defaultRandom(),
  transactionId: text('transaction_id'),
  studentId: uuid('student_id').notNull(),
  studentName: text('student_name'),
  assessorId: uuid('assessor_id').notNull(),
  assessorName: text('assessor_name'),
  companyName: text('company_name'),
  projectTitle: text('project_title'),
  ratings: jsonb('ratings').notNull().default({}),
  comments: jsonb('comments').notNull().default({}),
  sectionAverages: jsonb('section_averages').notNull().default({}),
  overallAverage: real('overall_average'),
  overallComments: text('overall_comments').notNull().default(''),
  strengths: text('strengths').notNull().default(''),
  areasForImprovement: text('areas_for_improvement').notNull().default(''),
  recommendForFuture: boolean('recommend_for_future').notNull().default(false),
  sentToStudent: boolean('sent_to_student').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
