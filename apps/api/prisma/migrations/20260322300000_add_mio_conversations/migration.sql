-- Mio AI Conversations — persistent chat history

CREATE TABLE IF NOT EXISTS "mio_conversations" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT,
  "context" JSONB,
  "starred" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mio_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "mio_messages" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "toolCalls" JSONB,
  "toolResults" JSONB,
  "tokens" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mio_messages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "mio_messages"
  ADD CONSTRAINT "mio_messages_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "mio_conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "mio_conversations_tenantId_userId_idx" ON "mio_conversations"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "mio_conversations_tenantId_updatedAt_idx" ON "mio_conversations"("tenantId", "updatedAt");
CREATE INDEX IF NOT EXISTS "mio_messages_conversationId_createdAt_idx" ON "mio_messages"("conversationId", "createdAt");
