/**
 * AI Career Mentor Interface
 *
 * Why: This is the centerpiece of the coaching and synthesis experience.
 * It provides a specialized, context-aware chat experience that handles
 * real-time streaming and multi-source data injection.
 *
 * Key Features:
 * - Real-time Streaming: Uses `ReadableStream` with a custom event parser
 *   to handle chunked LLM responses.
 * - Context Orchestration: Bridges the `ContextSelector` and the server-side
 *   Strategy Pattern.
 * - Lifecycle safety: Synchronizes conversation props after commit and aborts
 *   stale requests when switching conversations.
 */
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { createConversation, type MessageData, type ConversationMode } from '@/app/actions/chat';
import { getPersonalizedGreeting } from '@/lib/chat/greeting';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChatMessage } from './chat-message';
import { SuggestedPrompts } from './suggested-prompts';
import { ChatContextDialog } from './chat-context-dialog';
import { ChatMessageList } from './chat-message-list';
import { ChatComposer } from './chat-composer';

type StreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'done'; cancelled: boolean }
  | { type: 'error'; message: string };

function parseStreamEvent(line: string): StreamEvent | null {
  try {
    return JSON.parse(line) as StreamEvent;
  } catch {
    return null;
  }
}

interface ChatInterfaceProps {
  conversationId?: string;
  mode: ConversationMode;
  userName?: string | null;
  initialMessages: MessageData[];
  projectId: string | null;
  goalId: string | null;
  contactId: string | null;
  reportIds?: string[];
  projects: Array<{ id: string; name: string; color: string }>;
  goals: Array<{ id: string; title: string }>;
  contacts: Array<{
    id: string;
    fullName: string;
    relationship: string | null;
    interactionsCount: number;
  }>;
  reports?: Array<{ id: string; title: string; createdAt: Date }>;
  isContextPending?: boolean;
  showPrompts?: boolean;
  onContextChange?: (
    projectId?: string | null,
    goalId?: string | null,
    contactId?: string | null,
    reportIds?: string[]
  ) => void;
}

export function ChatInterface({
  conversationId: initialConversationId,
  mode,
  userName,
  initialMessages,
  projectId,
  goalId,
  contactId,
  reportIds: initialReportIds = [],
  projects,
  goals,
  contacts,
  reports = [],
  isContextPending = false,
  showPrompts = false,
  onContextChange,
}: ChatInterfaceProps) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<MessageData[]>(initialMessages);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    projectId ? [projectId] : []
  );
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(goalId ? [goalId] : []);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(
    contactId ? [contactId] : []
  );
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>(initialReportIds);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const autoFollowRef = useRef(true);
  const initialMessageSignature = useMemo(
    () => initialMessages.map(message => message.id).join('|'),
    [initialMessages]
  );

  const greeting = useMemo(() => getPersonalizedGreeting({ name: userName }), [userName]);

  const isNearBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom < 150;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  // Sync state with server-provided conversation props after commit. Mutating
  // state during render is unsafe under concurrent React and can abort streams
  // unpredictably when navigating between conversations.
  const currentKey = `${initialConversationId}-${initialMessageSignature}-${projectId}-${goalId}-${contactId}-${initialReportIds.join(',')}`;
  const [prevKey, setPrevKey] = useState(currentKey);

  useEffect(() => {
    if (currentKey === prevKey) return;
    requestAbortRef.current?.abort();
    setConversationId(initialConversationId);
    setMessages(initialMessages);
    setSelectedProjectIds(projectId ? [projectId] : []);
    setSelectedGoalIds(goalId ? [goalId] : []);
    setSelectedContactIds(contactId ? [contactId] : []);
    setSelectedReportIds(initialReportIds);
    setStreamingContent('');
    setIsStreaming(false);
    setInput('');
    setShowJumpToLatest(false);
    autoFollowRef.current = true;
    setPrevKey(currentKey);
  }, [
    currentKey,
    prevKey,
    initialConversationId,
    initialMessages,
    projectId,
    goalId,
    contactId,
    initialReportIds,
  ]);

  useEffect(() => {
    return () => {
      requestAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!autoFollowRef.current) return;
    scrollToBottom(streamingContent ? 'auto' : 'smooth');
  }, [messages, streamingContent]);

  const handleScroll = () => {
    const nearBottom = isNearBottom();
    autoFollowRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom);
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

  const triggerResponse = useCallback(
    async (
      userContent: string,
      targetConversationId?: string,
      regenerateMessageId?: string,
      reuseExistingUserTurn = false
    ) => {
      const cid = targetConversationId || conversationId;
      if (isStreaming || !cid) return;

      const requestId = crypto.randomUUID();
      requestIdRef.current = requestId;
      autoFollowRef.current = true;
      setIsStreaming(true);
      setStreamingContent('');

      const abortController = new AbortController();
      requestAbortRef.current = abortController;

      let streamedResponse = '';

      const commitAssistantMessage = () => {
        if (!streamedResponse.trim()) return;
        const assistantMessage: MessageData = {
          id: `local-assistant-${requestId}-${Date.now()}`,
          role: 'assistant',
          content: streamedResponse,
          createdAt: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        streamedResponse = '';
        setStreamingContent('');
      };

      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            conversationId: cid,
            userMessage: userContent,
            requestId,
            regenerateMessageId,
            reuseExistingUserTurn,
          }),
        });

        if (!response.ok || !response.body) throw new Error('Failed to start chat stream');
        const contentType = response.headers.get('content-type');
        if (
          !contentType?.includes('application/x-ndjson') &&
          !contentType?.includes('application/json')
        ) {
          throw new Error('Invalid response from server.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex = buffer.indexOf('\n');
          while (newlineIndex >= 0) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (line) {
              const event = parseStreamEvent(line);
              if (event?.type === 'delta') {
                streamedResponse += event.content;
                setStreamingContent(streamedResponse);
              } else if (event?.type === 'error') {
                throw new Error(event.message);
              }
            }
            newlineIndex = buffer.indexOf('\n');
          }
        }
        commitAssistantMessage();
      } catch (error) {
        if (requestIdRef.current === requestId && !abortController.signal.aborted) {
          console.error('Failed to send message:', error);
          setMessages(prev => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: 'Sorry, I encountered an error. Please try again.',
              createdAt: new Date(),
            },
          ]);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsStreaming(false);
          setStreamingContent('');
        }
      }
    },
    [conversationId, isStreaming]
  );

  const handleStop = () => {
    requestAbortRef.current?.abort();
    setIsStreaming(false);
  };

  useEffect(() => {
    const autoStart = searchParams.get('autoStart') === 'true';
    if (
      autoStart &&
      messages.length === 1 &&
      messages[0].role === 'user' &&
      !isStreaming &&
      conversationId
    ) {
      const timer = setTimeout(
        () => void triggerResponse(messages[0].content, conversationId, undefined, true),
        500
      );
      return () => clearTimeout(timer);
    }
  }, [conversationId, messages, isStreaming, searchParams, triggerResponse]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isStreaming) return;

    let currentCid = conversationId;

    // Create conversation if it doesn't exist (landing page case)
    if (!currentCid) {
      try {
        const newConv = await createConversation(
          mode,
          projectId || undefined,
          goalId || undefined,
          contactId || undefined
        );
        currentCid = newConv.id;
        setConversationId(currentCid);
        window.history.replaceState(null, '', `/chat/${currentCid}`);
      } catch (error) {
        console.error('Failed to create conversation:', error);
        return;
      }
    }

    const userMessage: MessageData = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await triggerResponse(trimmedInput, currentCid);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="bg-background text-foreground relative flex min-h-0 w-full flex-1 flex-col">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent flex-1 overflow-y-auto px-4"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col pt-8 pb-48">
          {messages.length === 0 &&
            !streamingContent &&
            (showPrompts ? (
              <SuggestedPrompts userName={userName} projects={projects} />
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both flex min-h-[40vh] flex-col items-center justify-center text-center duration-1000">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="from-primary/20 to-primary/5 mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br shadow-inner ring-1 ring-white/10"
                >
                  <Sparkles className="text-primary h-6 w-6" />
                </motion.div>
                <h2 className="text-foreground mb-4 font-serif text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
                  {greeting}
                </h2>
                <p className="text-muted-foreground/80 max-w-[400px] text-base leading-relaxed font-medium">
                  Your coach is ready. What project or goal should we focus on?
                </p>
              </div>
            ))}

          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            isContextPending={isContextPending}
            streamingContent={streamingContent}
            onRegenerate={message => {
              const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
              if (lastUserMessage) {
                setMessages(prev => prev.slice(0, -1));
                void triggerResponse(lastUserMessage.content, conversationId, message.id);
              }
            }}
          />
        </div>
      </div>

      <ChatComposer
        input={input}
        setInput={setInput}
        textareaRef={textareaRef}
        mode={mode}
        isStreaming={isStreaming}
        isContextPending={isContextPending}
        showJumpToLatest={showJumpToLatest}
        onJumpToLatest={() => {
          autoFollowRef.current = true;
          setShowJumpToLatest(false);
          scrollToBottom('smooth');
        }}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
        onStop={handleStop}
        projects={projects}
        goals={goals}
        contacts={contacts}
        reports={reports}
        selectedProjectIds={selectedProjectIds}
        selectedGoalIds={selectedGoalIds}
        selectedContactIds={selectedContactIds}
        selectedReportIds={selectedReportIds}
        setSelectedProjectIds={setSelectedProjectIds}
        setSelectedGoalIds={setSelectedGoalIds}
        setSelectedContactIds={setSelectedContactIds}
        setSelectedReportIds={setSelectedReportIds}
        onContextOpen={() => setIsContextModalOpen(true)}
        onContextChange={onContextChange}
      />

      <ChatContextDialog
        open={isContextModalOpen}
        onOpenChange={setIsContextModalOpen}
        projects={projects}
        goals={goals}
        contacts={contacts}
        reports={reports}
        selectedProjectIds={selectedProjectIds}
        selectedGoalIds={selectedGoalIds}
        selectedContactIds={selectedContactIds}
        selectedReportIds={selectedReportIds}
        onProjectChange={setSelectedProjectIds}
        onGoalChange={setSelectedGoalIds}
        onContactChange={setSelectedContactIds}
        onReportChange={setSelectedReportIds}
        onContextChange={onContextChange}
      />
    </div>
  );
}
