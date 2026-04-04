-- Unique constraints to prevent duplicate records on re-enrichment
-- First deduplicate existing data, then add unique indexes

-- Deduplicate KbRegistryChange (keep newest per group)
DELETE FROM "kb_registry_changes" WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY "organizationId", "changeDate", "changeType"
      ORDER BY "fetchedAt" DESC
    ) AS rn FROM "kb_registry_changes"
  ) t WHERE rn > 1
);

-- Deduplicate KbSbirkaListina (keep newest per group)
DELETE FROM "kb_sbirka_listin" WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY "organizationId", "justiceDocId"
      ORDER BY "fetchedAt" DESC
    ) AS rn FROM "kb_sbirka_listin"
  ) t WHERE rn > 1
);

-- Deduplicate StatutoryBodyKb (keep newest per group)
DELETE FROM "kb_statutory_bodies" WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY "organizationId", "firstName", "lastName", "role"
      ORDER BY "createdAt" DESC
    ) AS rn FROM "kb_statutory_bodies"
  ) t WHERE rn > 1
);

-- KbRegistryChange: one entry per (org, date, type)
CREATE UNIQUE INDEX "kb_registry_changes_organizationId_changeDate_changeType_key"
  ON "kb_registry_changes"("organizationId", "changeDate", "changeType");

-- KbSbirkaListina: one entry per (org, justiceDocId)
CREATE UNIQUE INDEX "kb_sbirka_listin_organizationId_justiceDocId_key"
  ON "kb_sbirka_listin"("organizationId", "justiceDocId");

-- StatutoryBodyKb: one entry per (org, person, role)
CREATE UNIQUE INDEX "kb_statutory_bodies_organizationId_firstName_lastName_role_key"
  ON "kb_statutory_bodies"("organizationId", "firstName", "lastName", "role");
