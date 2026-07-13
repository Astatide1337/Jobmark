CREATE TABLE "ChatRequest" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "targetMessageId" TEXT,
    "userMessageId" TEXT,
    "createdUserMessage" BOOLEAN NOT NULL DEFAULT false,
    "assistantMessageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatRequest_conversationId_requestId_key"
  ON "ChatRequest"("conversationId", "requestId");
CREATE UNIQUE INDEX "ChatRequest_targetMessageId_key"
  ON "ChatRequest"("targetMessageId");
CREATE INDEX "ChatRequest_conversationId_status_idx"
  ON "ChatRequest"("conversationId", "status");
CREATE INDEX "ChatRequest_userId_createdAt_idx"
  ON "ChatRequest"("userId", "createdAt");

ALTER TABLE "ChatRequest"
  ADD CONSTRAINT "ChatRequest_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatRequest"
  ADD CONSTRAINT "ChatRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
