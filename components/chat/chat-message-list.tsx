'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Loader2 } from 'lucide-react';
import type { MessageData } from '@/app/actions/chat';
import { ChatMessage } from './chat-message';

interface ChatMessageListProps {
  messages: MessageData[];
  isStreaming: boolean;
  isContextPending: boolean;
  streamingContent: string;
  onRegenerate: (message: MessageData) => void;
}

function StatusIcon({
  isContextPending,
  hasContent,
}: {
  isContextPending: boolean;
  hasContent: boolean;
}) {
  if (isContextPending) {
    return (
      <div className="from-primary/20 to-primary/5 text-primary ring-primary/20 mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br shadow-md ring-1">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (hasContent) return null;
  return (
    <div className="from-primary/20 to-primary/5 text-primary ring-primary/20 mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br shadow-md ring-1">
      <Bot className="h-5 w-5" />
    </div>
  );
}

function StatusContent({
  isStreaming,
  isContextPending,
  streamingContent,
}: Omit<ChatMessageListProps, 'messages' | 'onRegenerate'>) {
  if (isStreaming && !streamingContent) {
    return (
      <div className="flex animate-pulse items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="bg-primary/40 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
          <span className="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
        </span>
        <span>Thinking...</span>
      </div>
    );
  }
  if (isContextPending) return <span className="animate-pulse">Updating context...</span>;
  if (!streamingContent) return null;
  return (
    <ChatMessage
      message={{
        id: 'streaming',
        role: 'assistant',
        content: streamingContent,
        createdAt: new Date(),
      }}
      isStreaming
    />
  );
}

export function ChatMessageList({
  messages,
  isStreaming,
  isContextPending,
  streamingContent,
  onRegenerate,
}: ChatMessageListProps) {
  return (
    <div className="relative space-y-10">
      <AnimatePresence initial={false} mode="popLayout">
        {messages.map((message, idx) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <ChatMessage
              message={message}
              isLast={idx === messages.length - 1}
              onRegenerate={
                idx === messages.length - 1 && message.role === 'assistant'
                  ? () => onRegenerate(message)
                  : undefined
              }
            />
          </motion.div>
        ))}

        {(isStreaming || isContextPending) && (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto w-full max-w-3xl"
          >
            <div className="group flex w-full max-w-full gap-5">
              <StatusIcon
                isContextPending={isContextPending}
                hasContent={Boolean(streamingContent)}
              />
              <div className="min-w-0 flex-1 py-2">
                <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                  <StatusContent
                    isStreaming={isStreaming}
                    isContextPending={isContextPending}
                    streamingContent={streamingContent}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
