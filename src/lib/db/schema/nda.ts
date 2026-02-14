import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { ndaStatusEnum } from './enums';

export const ndaDocuments = pgTable('nda_documents', {
  listingId: uuid('listing_id').primaryKey(),
  documentId: text('document_id'),
  uploadedBy: uuid('uploaded_by'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  documentUrl: text('document_url'),
  documentName: text('document_name'),
  ndaText: text('nda_text'),
  status: ndaStatusEnum('status').notNull().default('pending'),
});

export const ndaSignatureRequests = pgTable('nda_signature_requests', {
  transactionId: text('transaction_id').primaryKey(),
  signatureId: text('signature_id'),
  listingId: uuid('listing_id'),
  title: text('title'),
  status: ndaStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  signers: jsonb('signers').notNull().default([]),
  documentUrl: text('document_url'),
  ndaText: text('nda_text'),
  signedDocumentUrl: text('signed_document_url'),
});
