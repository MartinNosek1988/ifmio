-- Unique constraints to prevent duplicate records on re-enrichment

-- KbRegistryChange: one entry per (org, date, type)
CREATE UNIQUE INDEX "kb_registry_changes_organizationId_changeDate_changeType_key"
  ON "kb_registry_changes"("organizationId", "changeDate", "changeType");

-- KbSbirkaListina: one entry per (org, justiceDocId)
CREATE UNIQUE INDEX "kb_sbirka_listin_organizationId_justiceDocId_key"
  ON "kb_sbirka_listin"("organizationId", "justiceDocId");

-- StatutoryBodyKb: one entry per (org, person, role)
CREATE UNIQUE INDEX "kb_statutory_bodies_organizationId_firstName_lastName_role_key"
  ON "kb_statutory_bodies"("organizationId", "firstName", "lastName", "role");
