-- The internal chat product is gone. These tables contain only its legacy
-- conversation/request data and are intentionally removed for this deployment.
DROP TABLE IF EXISTS "ChatRequest";
DROP TABLE IF EXISTS "Message";
DROP TABLE IF EXISTS "_ConversationToReport";
DROP TABLE IF EXISTS "Conversation";
