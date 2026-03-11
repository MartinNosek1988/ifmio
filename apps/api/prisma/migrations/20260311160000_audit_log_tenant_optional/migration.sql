-- AlterTable: make tenantId optional on audit_logs for system-level events (e.g. LOGIN_FAIL with unknown user)
ALTER TABLE "audit_logs" ALTER COLUMN "tenantId" DROP NOT NULL;
