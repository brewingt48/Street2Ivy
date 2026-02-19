import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { attachmentFileTypeEnum } from './enums';

export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalName: text('original_name'),
  storedName: text('stored_name'),
  mimeType: text('mime_type'),
  size: integer('size'),
  sizeFormatted: text('size_formatted'),
  fileType: attachmentFileTypeEnum('file_type').notNull().default('file'),
  extension: text('extension'),
  uploadedBy: uuid('uploaded_by'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  contextType: text('context_type'),
  contextId: text('context_id'),
  downloadCount: integer('download_count').notNull().default(0),
  lastDownloadedAt: timestamp('last_downloaded_at', { withTimezone: true }),
});
