-- Add 'internal' to InvoiceType enum
ALTER TYPE "InvoiceType" ADD VALUE IF NOT EXISTS 'internal';
