'use client';

import { useEffect, useMemo, useRef, useState, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp,
  ArrowDown,
  Square,
  Sparkles,
  Loader2,
  Bot,
  Copy,
  Check,
  Terminal,
  RotateCw,
  Brain,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createConversation, type MessageData, type ConversationMode } from '@/app/actions/chat';
import { ContextSelector } from './context-selector';
import { getPersonalizedGreeting } from '@/lib/chat/greeting';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Users, Target, Briefcase } from 'lucide-react';

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

function getModePlaceholder(mode: ConversationMode): string {
  switch (mode) {
    case 'goal-coach':
      return 'Describe your goal...';
    case 'interview':
      return 'Type your interview answer...';
    default:
      return 'Ask your mentor anything...';
  }
}

interface ChatInterfaceProps {
  conversationId?: string; // Made optional for landing page
  mode: ConversationMode;
  userName?: string | null;
  initialMessages: MessageData[];
  projectId: string | null;
  goalId: string | null;
  contactId: string | null;
  projects: Array<{ id: string; name: string; color: string }>;
  goals: Array<{ id: string; title: string }>;
  contacts: Array<{
    id: string;
    fullName: string;
    relationship: string | null;
    interactionsCount: number;
  }>;
  isContextPending?: boolean;
  showPrompts?: boolean;
  onContextChange?: (
    projectId?: string | null,
    goalId?: string | null,
    contactId?: string | null
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
  projects,
  goals,
  contacts,
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

  useEffect(() => {
    setConversationId(initialConversationId);
    setMessages(initialMessages);
    setSelectedProjectIds(projectId ? [projectId] : []);
    setSelectedGoalIds(goalId ? [goalId] : []);
    setSelectedContactIds(contactId ? [contactId] : []);
    setStreamingContent('');
    setIsStreaming(false);
    setInput('');
    setShowJumpToLatest(false);
    autoFollowRef.current = true;
    requestAbortRef.current?.abort();
  }, [
    initialConversationId,
    initialMessageSignature,
    initialMessages,
    projectId,
    goalId,
    contactId,
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
    async (userContent: string, targetConversationId?: string) => {
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
      const timer = setTimeout(() => void triggerResponse(messages[0].content), 500);
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
      {/* 1. Main Conversation Canvas */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent flex-1 overflow-y-auto px-4"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col pt-8 pb-48">
          {/* Empty State / Greeting / Prompts */}
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
                  Your career mentor is ready. What project or goal should we focus on?
                </p>
              </div>
            ))}

          {/* Message Stream */}
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
                        ? () => {
                            const lastUserMessage = [...messages]
                              .reverse()
                              .find(m => m.role === 'user');
                            if (lastUserMessage) {
                              setMessages(prev => prev.slice(0, -1));
                              void triggerResponse(lastUserMessage.content);
                            }
                          }
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
                    <div className="from-primary/20 to-primary/5 text-primary ring-primary/20 mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br shadow-md ring-1">
                      {isContextPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Bot className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 py-2">
                      <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                        {isStreaming && !streamingContent ? (
                          <div className="flex animate-pulse items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="bg-primary/40 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                              <span className="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
                            </span>
                            <span>Thinking...</span>
                          </div>
                        ) : isContextPending ? (
                          <span className="animate-pulse">Updating context...</span>
                        ) : streamingContent ? (
                          <ChatMessage
                            message={{
                              id: 'streaming',
                              role: 'assistant',
                              content: streamingContent,
                              createdAt: new Date(),
                            }}
                            isStreaming
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 2. Anchored Composer Dock */}
      <div className="from-background via-background/90 pointer-events-none absolute right-0 bottom-0 left-0 z-30 bg-gradient-to-t to-transparent px-4 pt-20 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto relative mx-auto w-full max-w-2xl">
          {/* Jump Button */}
          {showJumpToLatest && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              className="absolute -top-14 left-1/2 z-40 -translate-x-1/2"
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="border-primary/20 bg-background/95 hover:bg-background h-8 gap-2 rounded-full border text-[11px] shadow-2xl backdrop-blur transition-all hover:scale-105 active:scale-95"
                onClick={() => {
                  autoFollowRef.current = true;
                  setShowJumpToLatest(false);
                  scrollToBottom('smooth');
                }}
              >
                <ArrowDown className="text-primary h-3 w-3" />
                <span className="text-foreground font-semibold">New messages</span>
              </Button>
            </motion.div>
          )}

          <div
            className={cn(
              'bg-card/60 group relative flex flex-col rounded-[24px] border border-white/10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-500 ease-in-out',
              isStreaming
                ? 'border-primary/30 ring-primary/10 ring-1'
                : 'focus-within:border-primary/50 focus-within:ring-primary/20 focus-within:ring-1 hover:border-white/20'
            )}
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getModePlaceholder(mode)}
              className="placeholder:text-muted-foreground/30 text-foreground scrollbar-none max-h-[200px] min-h-[56px] w-full resize-none border-0 bg-transparent px-5 py-4 text-[15px] leading-relaxed shadow-none focus-visible:ring-0"
              disabled={isStreaming || isContextPending}
              rows={1}
            />

            <div className="flex items-center justify-between px-2 pb-2 pl-4">
              <div
                className={cn(
                  'min-w-0 flex-1 transition-opacity',
                  isContextPending && 'pointer-events-none opacity-50'
                )}
              >
                <ContextSelector
                  projects={projects}
                  goals={goals}
                  contacts={contacts}
                  selectedProjectIds={selectedProjectIds}
                  selectedGoalIds={selectedGoalIds}
                  selectedContactIds={selectedContactIds}
                  onProjectSelect={ids => {
                    setSelectedProjectIds(ids);
                    onContextChange?.(
                      ids[0] || null,
                      selectedGoalIds[0] || null,
                      selectedContactIds[0] || null
                    );
                  }}
                  onGoalSelect={ids => {
                    setSelectedGoalIds(ids);
                    onContextChange?.(
                      selectedProjectIds[0] || null,
                      ids[0] || null,
                      selectedContactIds[0] || null
                    );
                  }}
                  onContactSelect={ids => {
                    setSelectedContactIds(ids);
                    onContextChange?.(
                      selectedProjectIds[0] || null,
                      selectedGoalIds[0] || null,
                      ids[0] || null
                    );
                  }}
                  onProjectRemove={id => {
                    setSelectedProjectIds(selectedProjectIds.filter(p => p !== id));
                    onContextChange?.(
                      null,
                      selectedGoalIds[0] || null,
                      selectedContactIds[0] || null
                    );
                  }}
                  onGoalRemove={id => {
                    setSelectedGoalIds(selectedGoalIds.filter(g => g !== id));
                    onContextChange?.(
                      selectedProjectIds[0] || null,
                      null,
                      selectedContactIds[0] || null
                    );
                  }}
                  onContactRemove={id => {
                    setSelectedContactIds(selectedContactIds.filter(c => c !== id));
                    onContextChange?.(
                      selectedProjectIds[0] || null,
                      selectedGoalIds[0] || null,
                      null
                    );
                  }}
                  onOpenContextModal={() => setIsContextModalOpen(true)}
                />
              </div>

              <div className="ml-2 flex shrink-0 items-center gap-2">
                {isStreaming ? (
                  <Button
                    onClick={handleStop}
                    variant="ghost"
                    size="icon"
                    className="bg-primary/10 hover:bg-primary/20 text-primary h-9 w-9 rounded-full transition-all duration-300"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span className="sr-only">Stop</span>
                  </Button>
                ) : (
                  <Button
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || isContextPending}
                    size="icon"
                    className={cn(
                      'h-9 w-9 rounded-full shadow-md transition-all duration-500',
                      input.trim()
                        ? 'bg-primary text-primary-foreground shadow-primary/20 hover:scale-105 active:scale-95'
                        : 'bg-muted/30 text-muted-foreground/30 opacity-40'
                    )}
                  >
                    <ArrowUp className="h-5 w-5" />
                    <span className="sr-only">Send</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 text-center">
            <p className="text-muted-foreground/20 text-[9px] font-bold tracking-[0.2em] uppercase">
              Jobmark Career Intelligence
            </p>
          </div>
        </div>
      </div>

      <CommandDialog
        open={isContextModalOpen}
        onOpenChange={setIsContextModalOpen}
        title="Add Context"
        description="Select a project, goal, or contact to focus your conversation."
        className="lg:left-[calc(50%+8rem)]"
      >
        <CommandInput placeholder="Search context..." />
        <CommandList className="scrollbar-none">
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Projects">
            {projects.map(project => (
              <CommandItem
                key={project.id}
                onSelect={() => {
                  const newIds = selectedProjectIds.includes(project.id)
                    ? selectedProjectIds.filter(id => id !== project.id)
                    : [...selectedProjectIds, project.id];
                  setSelectedProjectIds(newIds);
                  onContextChange?.(
                    newIds[0] || null,
                    selectedGoalIds[0] || null,
                    selectedContactIds[0] || null
                  );
                  setIsContextModalOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                <Briefcase className="text-muted-foreground h-4 w-4" />
                <span>{project.name}</span>
                {selectedProjectIds.includes(project.id) && (
                  <span className="text-primary ml-auto text-xs font-medium">Selected</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Goals">
            {goals.map(goal => (
              <CommandItem
                key={goal.id}
                onSelect={() => {
                  const newIds = selectedGoalIds.includes(goal.id)
                    ? selectedGoalIds.filter(id => id !== goal.id)
                    : [...selectedGoalIds, goal.id];
                  setSelectedGoalIds(newIds);
                  onContextChange?.(
                    selectedProjectIds[0] || null,
                    newIds[0] || null,
                    selectedContactIds[0] || null
                  );
                  setIsContextModalOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <Target className="text-muted-foreground h-4 w-4" />
                <span>{goal.title}</span>
                {selectedGoalIds.includes(goal.id) && (
                  <span className="text-primary ml-auto text-xs font-medium">Selected</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Network & Contacts">
            {contacts.map(contact => (
              <CommandItem
                key={contact.id}
                onSelect={() => {
                  const newIds = selectedContactIds.includes(contact.id)
                    ? selectedContactIds.filter(id => id !== contact.id)
                    : [...selectedContactIds, contact.id];
                  setSelectedContactIds(newIds);
                  onContextChange?.(
                    selectedProjectIds[0] || null,
                    selectedGoalIds[0] || null,
                    newIds[0] || null
                  );
                  setIsContextModalOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <Users className="text-muted-foreground h-4 w-4" />
                <div className="flex flex-col">
                  <span>{contact.fullName}</span>
                  {contact.relationship && (
                    <span className="text-muted-foreground text-[10px]">
                      {contact.relationship}
                    </span>
                  )}
                </div>
                {selectedContactIds.includes(contact.id) && (
                  <span className="text-primary ml-auto text-xs font-medium">Selected</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

interface ChatMessageProps {
  message: MessageData;
  isStreaming?: boolean;
  isLast?: boolean;
  onRegenerate?: () => void;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="border-border/70 bg-card/80 my-5 overflow-hidden rounded-xl border shadow-sm ring-1 ring-white/5">
      <div className="border-border/70 bg-muted/20 flex items-center justify-between border-b px-4 py-2">
        <div className="text-muted-foreground flex items-center gap-2 text-[11px] font-medium">
          <Terminal className="h-3.5 w-3.5" />
          <span className="tracking-widest uppercase">{language}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 text-[11px] font-medium transition-all"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: 'transparent',
          padding: '1.25rem',
          fontSize: '0.85rem',
          lineHeight: '1.6',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function ChatMessage({ message, isStreaming, isLast, onRegenerate }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const content = message.content;
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={cn(
        'animate-in fade-in mx-auto flex w-full max-w-3xl duration-300',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {isUser ? (
        <div className="group relative max-w-[75%]">
          <div className="bg-muted/40 text-foreground/90 rounded-2xl rounded-tr-sm px-5 py-3.5 text-sm leading-relaxed shadow-sm ring-1 ring-white/5 backdrop-blur-sm">
            {content}
          </div>
          <button
            onClick={handleCopy}
            className="text-muted-foreground/40 hover:text-primary absolute top-1.5 -left-12 p-2 opacity-0 transition-all duration-300 group-hover:opacity-100 active:scale-110"
            title="Copy message"
          >
            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <div className="group flex w-full max-w-full gap-5">
          <div className="from-primary/20 to-primary/5 text-primary ring-primary/20 mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md ring-1">
            <Bot className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 py-1">
            <div className="prose prose-neutral dark:prose-invert text-foreground/90 selection:bg-primary/20 max-w-none text-base leading-relaxed break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const rawCode = String(children ?? '');
                    const match = /language-(\w+)/.exec(className || '');
                    const isBlock = Boolean(match) || rawCode.includes('\n');

                    if (isBlock) {
                      return (
                        <CodeBlock
                          language={match?.[1] ?? 'text'}
                          code={rawCode.replace(/\n$/, '')}
                        />
                      );
                    }

                    return (
                      <code
                        className={cn(
                          'border-border/60 bg-muted/50 text-foreground rounded-md border px-1.5 py-0.5 font-mono text-[0.9em] font-medium',
                          className
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => (
                    <p className="text-foreground/95 mb-4 leading-7 font-normal last:mb-0">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="marker:text-primary/60 mb-5 list-disc space-y-2 pl-5">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="marker:text-primary/60 mb-5 list-decimal space-y-2 pl-5">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary decoration-primary/30 hover:decoration-primary underline underline-offset-4 transition-all"
                    >
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-primary/20 text-muted-foreground/80 my-5 border-l-4 pl-5 text-lg italic">
                      {children}
                    </blockquote>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-foreground mt-8 mb-4 font-serif text-2xl font-semibold tracking-tight first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-foreground mt-8 mb-3 font-serif text-xl font-semibold tracking-tight first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-foreground mt-6 mb-2 text-lg font-semibold tracking-tight first:mt-0">
                      {children}
                    </h3>
                  ),
                  hr: () => <hr className="border-border/40 my-8" />,
                  table: ({ children }) => (
                    <div className="border-border/60 my-6 w-full overflow-y-auto rounded-lg border">
                      <table className="w-full text-left text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/40 font-medium">{children}</thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-border/40 divide-y">{children}</tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-muted/20 transition-colors">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="text-foreground/80 px-4 py-3 font-semibold">{children}</th>
                  ),
                  td: ({ children }) => <td className="px-4 py-3 align-top">{children}</td>,
                }}
              >
                {content}
              </ReactMarkdown>

              {isStreaming && (
                <div className="mt-2 inline-flex items-center gap-1.5 py-1">
                  <span className="bg-primary/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
                  <span className="bg-primary/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
                  <span className="bg-primary/60 h-1.5 w-1.5 animate-bounce rounded-full" />
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs transition-all active:scale-95"
              >
                {isCopied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>

              {isLast && !isStreaming && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs transition-all active:scale-95"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SuggestedPrompt {
  id: string;
  icon: any;
  title: string;
  description: string;
  mode: ConversationMode;
  color: string;
  bgColor: string;
  needsProject?: boolean;
  initialMessage?: string;
}

const SUGGESTED_CHAT_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'goal-setting',
    icon: Target,
    title: 'Set a New Goal',
    description: 'Break down a big ambition into a 7-step actionable plan',
    mode: 'goal-coach' as ConversationMode,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'interview',
    icon: Briefcase,
    title: 'Practice Interview',
    description: 'Mock behavioral session based on your real project work',
    mode: 'interview' as ConversationMode,
    needsProject: true,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'imposter',
    icon: Brain,
    title: 'Overcome Self-Doubt',
    description: 'Work through imposter syndrome and build career confidence',
    mode: 'general' as ConversationMode,
    initialMessage:
      "I've been struggling with imposter syndrome at work. I feel like I don't belong and that people will find out I'm not as capable as they think. Can you help me work through these feelings?",
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  {
    id: 'clarity',
    icon: TrendingUp,
    title: 'Career Direction',
    description: 'Get clarity on your path and figure out your next big move',
    mode: 'general' as ConversationMode,
    initialMessage:
      'I feel stuck in my career and unsure where I want to go next. Can you help me think through my options and figure out a direction that aligns with my values?',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
];

interface SuggestedPromptsProps {
  projects: Array<{ id: string; name: string; color: string }>;
  userName?: string | null;
  onSelect?: (prompt: string) => void;
}

function SuggestedPrompts({ projects, userName, onSelect }: SuggestedPromptsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const greeting = useMemo(() => getPersonalizedGreeting({ name: userName }), [userName]);

  const handlePromptClick = async (prompt: SuggestedPrompt, projectId?: string) => {
    if (onSelect && !prompt.needsProject) {
      onSelect(prompt.initialMessage || prompt.title);
      return;
    }

    startTransition(async () => {
      try {
        const conversation = await createConversation(
          prompt.mode,
          projectId,
          undefined,
          undefined,
          prompt.initialMessage
        );

        const url = `/chat/${conversation.id}${prompt.initialMessage ? '?autoStart=true' : ''}`;
        router.push(url);
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-32 md:py-10">
      <div className="animate-in fade-in slide-in-from-top-4 fill-mode-both mb-8 space-y-3 text-center duration-1000">
        <h1 className="text-foreground font-serif text-3xl leading-tight font-bold tracking-tight md:text-4xl">
          {greeting}
        </h1>
        <p className="text-muted-foreground/70 mx-auto max-w-xl text-base leading-relaxed font-medium">
          Your AI career partner. How shall we begin today?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SUGGESTED_CHAT_PROMPTS.map(prompt => (
          <div key={prompt.id} className="h-full">
            {prompt.needsProject ? (
              projects.length > 0 ? (
                <Card
                  className={cn(
                    'group border-border/40 bg-card/10 hover:border-primary/30 hover:bg-card/20 hover:shadow-primary/5 relative h-full overflow-hidden rounded-[1.5rem] p-6 transition-all duration-500 hover:shadow-xl',
                    isPending && 'pointer-events-none opacity-70'
                  )}
                >
                  <div className="flex h-full flex-col">
                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl shadow-md ring-1 ring-white/10',
                          prompt.bgColor
                        )}
                      >
                        <prompt.icon className={cn('h-5 w-5', prompt.color)} />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-foreground group-hover:text-primary mb-2 text-lg font-bold transition-colors">
                        {prompt.title}
                      </h3>
                      <p className="text-muted-foreground/80 mb-6 text-sm leading-relaxed">
                        {prompt.description}
                      </p>

                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {projects.slice(0, 4).map(project => (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => handlePromptClick(prompt, project.id)}
                              disabled={isPending}
                              className="border-border/60 bg-background/40 text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                              {project.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="border-border/60 bg-muted/5 flex h-full flex-col items-center justify-center rounded-[1.5rem] border-dashed p-6 text-center">
                  <h3 className="text-muted-foreground/60 mb-2 text-base font-bold">
                    {prompt.title}
                  </h3>
                  <p className="text-muted-foreground/40 text-xs leading-relaxed">
                    Set up your first project to unlock this mode.
                  </p>
                </Card>
              )
            ) : (
              <Card
                onClick={() => handlePromptClick(prompt)}
                className={cn(
                  'group border-border/40 bg-card/10 hover:border-primary/30 hover:bg-card/20 hover:shadow-primary/5 relative h-full cursor-pointer overflow-hidden rounded-[1.5rem] p-6 transition-all duration-500 hover:shadow-xl',
                  isPending && 'pointer-events-none opacity-70'
                )}
              >
                <div className="flex h-full flex-col">
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl shadow-md ring-1 ring-white/10',
                        prompt.bgColor
                      )}
                    >
                      <prompt.icon className={cn('h-5 w-5', prompt.color)} />
                    </div>
                    <div className="bg-muted/10 group-hover:bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full opacity-0 transition-all duration-500 group-hover:opacity-100">
                      <ArrowRight className="text-primary h-4 w-4" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-foreground group-hover:text-primary mb-2 text-lg font-bold transition-all duration-300 group-hover:translate-x-1">
                      {prompt.title}
                    </h3>
                    <p className="text-muted-foreground/80 group-hover:text-foreground text-sm leading-relaxed transition-colors duration-300">
                      {prompt.description}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
