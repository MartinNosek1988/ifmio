-- Evidence tasks for KB area assignment
CREATE TABLE "kb_evidence_tasks" (
    "id" TEXT NOT NULL,
    "assigneeId" TEXT,
    "assigneeName" TEXT,
    "region" TEXT NOT NULL,
    "district" TEXT,
    "cadastralArea" TEXT,
    "targetCount" INTEGER NOT NULL,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kb_evidence_tasks_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "kb_evidence_tasks_status_idx" ON "kb_evidence_tasks"("status");
CREATE INDEX "kb_evidence_tasks_assigneeId_idx" ON "kb_evidence_tasks"("assigneeId");
