"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ArrowDown, Square, Sparkles, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { createConversation, type MessageData, type ConversationMode } from "@/app/actions/chat";
import { ChatMessage } from "./chat-message";
import { ContextSelector } from "./context-selector";
import { getPersonalizedGreeting } from "@/lib/chat/greeting";

import { SuggestedPrompts } from "./suggested-prompts";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Users, Target, Briefcase } from "lucide-react";

type StreamEvent =

  | { type: "delta"; content: string }
  | { type: "done"; cancelled: boolean }
  | { type: "error"; message: string };

function parseStreamEvent(line: string): StreamEvent | null {
  try {
    return JSON.parse(line) as StreamEvent;
  } catch {
    return null;
  }
}

function getModePlaceholder(mode: ConversationMode): string {
  switch (mode) {
    case "goal-coach":
      return "Describe your goal...";
    case "interview":
      return "Type your interview answer...";
    default:
      return "Ask your mentor anything...";
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
  contacts: Array<{ id: string; fullName: string; relationship: string | null; interactionsCount: number }>;
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(goalId);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(contactId);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const searchParams = useSearchParams();

  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const autoFollowRef = useRef(true);

  const initialMessageSignature = useMemo(
    () => initialMessages.map((message) => message.id).join("|"),
    [initialMessages]
  );

  const greeting = useMemo(
    () => getPersonalizedGreeting({ name: userName }),
    [userName]
  );

  const isNearBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom < 150;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  useEffect(() => {
    setConversationId(initialConversationId);
    setMessages(initialMessages);
    setSelectedProjectId(projectId);
    setSelectedGoalId(goalId);
    setSelectedContactId(contactId);
    setStreamingContent("");
    setIsStreaming(false);
    setInput("");
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
    scrollToBottom(streamingContent ? "auto" : "smooth");
  }, [messages, streamingContent]);

  const handleScroll = () => {
    const nearBottom = isNearBottom();
    autoFollowRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom);
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

  const triggerResponse = useCallback(async (userContent: string, targetConversationId?: string) => {
    const cid = targetConversationId || conversationId;
    if (isStreaming || !cid) return;

    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;
    autoFollowRef.current = true;
    setIsStreaming(true);
    setStreamingContent("");

    const abortController = new AbortController();
    requestAbortRef.current = abortController;

    let streamedResponse = "";

    const commitAssistantMessage = () => {
      if (!streamedResponse.trim()) return;
      const assistantMessage: MessageData = {
        id: `local-assistant-${requestId}-${Date.now()}`,
        role: "assistant",
        content: streamedResponse,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      streamedResponse = "";
      setStreamingContent("");
    };

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          conversationId: cid,
          userMessage: userContent,
          requestId,
        }),
      });

      if (!response.ok || !response.body) throw new Error("Failed to start chat stream");
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/x-ndjson") && !contentType?.includes("application/json")) {
        throw new Error("Invalid response from server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line) {
            const event = parseStreamEvent(line);
            if (event?.type === "delta") {
              streamedResponse += event.content;
              setStreamingContent(streamedResponse);
            } else if (event?.type === "error") {
              throw new Error(event.message);
            }
          }
          newlineIndex = buffer.indexOf("\n");
        }
      }
      commitAssistantMessage();
    } catch (error) {
      if (requestIdRef.current === requestId && !abortController.signal.aborted) {
        console.error("Failed to send message:", error);
        setMessages((prev) => [...prev, {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          createdAt: new Date(),
        }]);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsStreaming(false);
        setStreamingContent("");
      }
    }
  }, [conversationId, isStreaming]);

  const handleStop = () => {
    requestAbortRef.current?.abort();
    setIsStreaming(false);
  };

  useEffect(() => {
    const autoStart = searchParams.get("autoStart") === "true";
    if (autoStart && messages.length === 1 && messages[0].role === "user" && !isStreaming && conversationId) {
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
        const newConv = await createConversation(mode, projectId || undefined, goalId || undefined, contactId || undefined);
        currentCid = newConv.id;
        setConversationId(currentCid);
        window.history.replaceState(null, "", `/chat/${currentCid}`);
      } catch (error) {
        console.error("Failed to create conversation:", error);
        return;
      }
    }

    const userMessage: MessageData = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: trimmedInput,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await triggerResponse(trimmedInput, currentCid);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="relative flex flex-1 w-full min-h-0 flex-col bg-background text-foreground">
      {/* 1. Main Conversation Canvas */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent px-4"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col pt-8 pb-48">

          {/* Empty State / Greeting / Prompts */}
          {messages.length === 0 && !streamingContent && (
            showPrompts ? (
              <SuggestedPrompts
                userName={userName}
                projects={projects}
              />
            ) : (
              <div className="flex min-h-[40vh] flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-primary/20 to-primary/5 shadow-inner ring-1 ring-white/10"
                >
                  <Sparkles className="h-6 w-6 text-primary" />
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground font-serif mb-4 leading-tight">
                  {greeting}
                </h2>
                <p className="max-w-[400px] text-base leading-relaxed text-muted-foreground/80 font-medium">
                  Your career mentor is ready. What project or goal should we focus on?
                </p>
              </div>
            )
          )}

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
                    onRegenerate={idx === messages.length - 1 && message.role === "assistant" ? () => {
                      const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
                      if (lastUserMessage) {
                        setMessages(prev => prev.slice(0, -1));
                        void triggerResponse(lastUserMessage.content);
                      }
                    } : undefined}
                  />
                </motion.div>
              ))}

              {(isStreaming || isContextPending) && (
                <motion.div
                  key="status"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-3xl mx-auto"
                >
                  <div className="flex w-full max-w-full gap-5 group">
                    <div className="mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20 shadow-md">
                      {isContextPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bot className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1 py-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                         {isStreaming && !streamingContent ? (
                           <div className="flex items-center gap-2 animate-pulse">
                             <span className="relative flex h-2 w-2">
                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                               <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                             </span>
                             <span>Thinking...</span>
                           </div>
                         ) : isContextPending ? (
                           <span className="animate-pulse">Updating context...</span>
                         ) : streamingContent ? (
                           <ChatMessage
                             message={{
                               id: "streaming",
                               role: "assistant",
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
      <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-20 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
        <div className="mx-auto w-full max-w-2xl relative pointer-events-auto">
          
          {/* Jump Button */}
          {showJumpToLatest && (
            <motion.div 
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              className="absolute -top-14 left-1/2 -translate-x-1/2 z-40"
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 rounded-full shadow-2xl border border-primary/20 text-[11px] gap-2 bg-background/95 backdrop-blur hover:bg-background transition-all hover:scale-105 active:scale-95"
                onClick={() => {
                  autoFollowRef.current = true;
                  setShowJumpToLatest(false);
                  scrollToBottom("smooth");
                }}
              >
                <ArrowDown className="h-3 w-3 text-primary" />
                <span className="text-foreground font-semibold">New messages</span>
              </Button>
            </motion.div>
          )}

          <div className={cn(
            "relative flex flex-col rounded-[24px] bg-card/60 backdrop-blur-2xl border border-white/10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] transition-all duration-500 ease-in-out group",
            isStreaming ? "border-primary/30 ring-1 ring-primary/10" : "hover:border-white/20 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20"
          )}>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getModePlaceholder(mode)}
              className="min-h-[56px] max-h-[200px] w-full resize-none border-0 bg-transparent px-5 py-4 text-[15px] shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/30 text-foreground leading-relaxed scrollbar-none"
              disabled={isStreaming || isContextPending}
              rows={1}
            />
            
            <div className="flex justify-between items-center px-2 pb-2 pl-4">
              <div className={cn("flex-1 min-w-0 transition-opacity", isContextPending && "opacity-50 pointer-events-none")}>
                <ContextSelector
                  projects={projects}
                  goals={goals}
                  contacts={contacts}
                  selectedProjectId={selectedProjectId}
                  selectedGoalId={selectedGoalId}
                  selectedContactId={selectedContactId}
                  onProjectSelect={(id) => {
                    setSelectedProjectId(id);
                    onContextChange?.(id, selectedGoalId, selectedContactId);
                  }}
                  onGoalSelect={(id) => {
                    setSelectedGoalId(id);
                    onContextChange?.(selectedProjectId, id, selectedContactId);
                  }}
                  onContactSelect={(id) => {
                    setSelectedContactId(id);
                    onContextChange?.(selectedProjectId, selectedGoalId, id);
                  }}
                  onOpenContextModal={() => setIsContextModalOpen(true)}
                />

              </div>
              
              <div className="flex shrink-0 items-center gap-2 ml-2">
                 {isStreaming ? (
                  <Button
                    onClick={handleStop}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-300"
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
                      "h-9 w-9 rounded-full transition-all duration-500 shadow-md",
                      input.trim() 
                        ? "bg-primary text-primary-foreground hover:scale-105 active:scale-95 shadow-primary/20" 
                        : "bg-muted/30 text-muted-foreground/30 opacity-40"
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
             <p className="text-[9px] text-muted-foreground/20 font-bold tracking-[0.2em] uppercase">
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
            {projects.map((project) => (
              <CommandItem
                key={project.id}
                onSelect={() => {
                  setSelectedProjectId(project.id);
                  onContextChange?.(project.id, selectedGoalId, selectedContactId);
                  setIsContextModalOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <div 
                  className="h-2 w-2 rounded-full" 
                  style={{ backgroundColor: project.color }}
                />
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{project.name}</span>
                {selectedProjectId === project.id && (
                  <span className="ml-auto text-xs text-primary font-medium">Selected</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Goals">
            {goals.map((goal) => (
              <CommandItem
                key={goal.id}
                onSelect={() => {
                  setSelectedGoalId(goal.id);
                  onContextChange?.(selectedProjectId, goal.id, selectedContactId);
                  setIsContextModalOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>{goal.title}</span>
                {selectedGoalId === goal.id && (
                  <span className="ml-auto text-xs text-primary font-medium">Selected</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Network & Contacts">
            {contacts.map((contact) => (
              <CommandItem
                key={contact.id}
                onSelect={() => {
                  setSelectedContactId(contact.id);
                  onContextChange?.(selectedProjectId, selectedGoalId, contact.id);
                  setIsContextModalOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span>{contact.fullName}</span>
                  {contact.relationship && (
                    <span className="text-[10px] text-muted-foreground">{contact.relationship}</span>
                  )}
                </div>
                {selectedContactId === contact.id && (
                  <span className="ml-auto text-xs text-primary font-medium">Selected</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

