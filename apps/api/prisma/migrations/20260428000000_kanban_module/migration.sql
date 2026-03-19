-- Kanban priority enum
DO $$ BEGIN CREATE TYPE "KanbanPriority" AS ENUM ('low', 'medium', 'high', 'urgent'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Kanban status enum
DO $$ BEGIN CREATE TYPE "KanbanStatus" AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- KanbanTask table
CREATE TABLE IF NOT EXISTS "kanban_tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "KanbanPriority" NOT NULL DEFAULT 'medium',
    "status" "KanbanStatus" NOT NULL DEFAULT 'backlog',
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "kanban_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "kanban_tasks_tenantId_status_idx" ON "kanban_tasks"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "kanban_tasks_tenantId_assigneeId_idx" ON "kanban_tasks"("tenantId", "assigneeId");

DO $$ BEGIN ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- UserFeature table
CREATE TABLE IF NOT EXISTS "user_features" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_features_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_features_userId_feature_key" ON "user_features"("userId", "feature");
DO $$ BEGIN ALTER TABLE "user_features" ADD CONSTRAINT "user_features_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
