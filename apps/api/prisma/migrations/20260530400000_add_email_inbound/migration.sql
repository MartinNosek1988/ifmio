-- Email Inbound: config + log tables + Invoice source fields

-- Invoice source tracking
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "emailFrom" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "emailSubject" TEXT;

-- Email inbound config (1:1 per tenant)
CREATE TABLE IF NOT EXISTS public.email_inbound_configs (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL UNIQUE,
  "slug" TEXT NOT NULL UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "autoApprove" BOOLEAN NOT NULL DEFAULT false,
  "allowedFrom" TEXT[] DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "email_inbound_configs_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- Email inbound audit log
CREATE TABLE IF NOT EXISTS public.email_inbound_logs (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "messageId" TEXT,
  "fromEmail" TEXT NOT NULL,
  "fromName" TEXT,
  "subject" TEXT,
  "attachments" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL,
  "errorMessage" TEXT,
  "invoicesCreated" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "email_inbound_logs_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_inbound_logs_tenantId_createdAt_idx"
  ON public.email_inbound_logs ("tenantId", "createdAt");

-- RLS for email inbound tables
ALTER TABLE public.email_inbound_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_inbound_logs ENABLE ROW LEVEL SECURITY;
