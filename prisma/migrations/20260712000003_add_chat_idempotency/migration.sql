ALTER TABLE "Message" ADD COLUMN "clientRequestId" TEXT;
ALTER TABLE "Message" ADD COLUMN "responseRequestId" TEXT;
CREATE UNIQUE INDEX "Message_conversationId_clientRequestId_key" ON "Message"("conversationId", "clientRequestId");
CREATE UNIQUE INDEX "Message_conversationId_responseRequestId_key" ON "Message"("conversationId", "responseRequestId");
