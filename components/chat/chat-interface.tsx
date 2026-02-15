"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown, ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { type MessageData, type ConversationMode } from "@/app/actions/chat";
import { ChatMessage } from "./chat-message";
import { ContextSelector } from "./context-selector";
import { getPersonalizedGreeting } from "@/lib/chat/greeting";

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
      return "Describe the goal you want to work on...";
    case "interview":
      return "Type your interview answer...";
    default:
      return "Ask your mentor anything...";
  }
}

function getModeSubline(mode: ConversationMode): string {
  switch (mode) {
    case "goal-coach":
      return "We can break your goal down into concrete daily steps.";
    case "interview":
      return "I can run a realistic mock interview and give feedback.";
    default:
      return "Let's turn your recent work into clear career momentum.";
  }
}

interface ChatInterfaceProps {
  conversationId: string;
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
  onContextChange?: (
    projectId?: string | null,
    goalId?: string | null,
    contactId?: string | null
  ) => void;
}

export function ChatInterface({
  conversationId,
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
  onContextChange,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageData[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
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
    return distanceFromBottom < 120;
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  useEffect(() => {
    setMessages(initialMessages);
    setStreamingContent("");
    setIsStreaming(false);
    setInput("");
    setShowJumpToLatest(false);
    autoFollowRef.current = true;

    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    requestIdRef.current = null;
  }, [conversationId, initialMessageSignature, initialMessages]);

  useEffect(() => {
    return () => {
      const activeRequestId = requestIdRef.current;
      requestAbortRef.current?.abort();

      if (activeRequestId) {
        void fetch("/api/chat/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: activeRequestId }),
        });
      }
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

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [input]);

  const handleStop = () => {
    const activeRequestId = requestIdRef.current;
    if (!activeRequestId) return;

    requestAbortRef.current?.abort();
    void fetch("/api/chat/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: activeRequestId }),
    }).catch(() => {
      // ignore fire-and-forget cancellation failures
    });
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isStreaming) return;

    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;

    autoFollowRef.current = true;
    setShowJumpToLatest(false);

    // optimistic user message
    const userMessage: MessageData = {
      id: `local-user-${requestId}`,
      role: "user",
      content: trimmedInput,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

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
          conversationId,
          userMessage: trimmedInput,
          requestId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start chat stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleLine = (line: string) => {
        if (!line) return;
        const event = parseStreamEvent(line);
        if (!event) return;
        if (requestIdRef.current !== requestId) return;

        if (event.type === "delta") {
          streamedResponse += event.content;
          setStreamingContent(streamedResponse);
          return;
        }

        if (event.type === "error") {
          throw new Error(event.message || "Failed to stream message");
        }

        if (event.type === "done") {
          commitAssistantMessage();
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex = buffer.indexOf("\n");

        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          handleLine(line);
          newlineIndex = buffer.indexOf("\n");
        }
      }

      const trailingLine = buffer.trim();
      if (trailingLine) {
        handleLine(trailingLine);
      }

      commitAssistantMessage();
    } catch (error) {
      const wasCancelled =
        abortController.signal.aborted || requestIdRef.current !== requestId;

      if (streamedResponse.trim()) {
        commitAssistantMessage();
      }

      if (!wasCancelled) {
        console.error("Failed to send message:", error);
        const errorMessage: MessageData = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        requestIdRef.current = null;
        requestAbortRef.current = null;
        setIsStreaming(false);
        setStreamingContent("");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <div
        className={cn(
          "border-b border-border/60 px-4 py-2",
          isContextPending && "opacity-70"
        )}
      >
        <div className="mx-auto w-full max-w-3xl">
          <ContextSelector
            projects={projects}
            goals={goals}
            contacts={contacts}
            selectedProjectId={projectId}
            selectedGoalId={goalId}
            selectedContactId={contactId}
            onProjectSelect={(id) => onContextChange?.(id, goalId, contactId)}
            onGoalSelect={(id) => onContextChange?.(projectId, id, contactId)}
            onContactSelect={(id) => onContextChange?.(projectId, goalId, id)}
          />
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
        data-lenis-prevent
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6">
          {messages.length === 0 && !streamingContent && (
            <div className="flex min-h-[45vh] flex-col items-center justify-center text-center">
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {greeting}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                {getModeSubline(mode)}
              </p>
            </div>
          )}

          <div className="space-y-6 pb-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {streamingContent && (
              <ChatMessage
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingContent,
                  createdAt: new Date(),
                }}
                isStreaming
              />
            )}
          </div>
        </div>
      </div>

      {showJumpToLatest && (
        <div className="pointer-events-none absolute bottom-24 left-0 right-0 z-20 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pointer-events-auto rounded-full bg-background/90"
            onClick={() => {
              autoFollowRef.current = true;
              setShowJumpToLatest(false);
              scrollToBottom("smooth");
            }}
          >
            <ArrowDown className="mr-1.5 h-3.5 w-3.5" />
            Jump to latest
          </Button>
        </div>
      )}

      <div className="border-t border-border/60 bg-background/95 px-4 pb-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto w-full max-w-3xl">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-2 shadow-sm">
            <div className="flex items-end gap-2 px-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getModePlaceholder(mode)}
                className="min-h-[28px] max-h-[180px] w-full resize-none border-0 bg-transparent px-2 py-2.5 text-sm shadow-none focus-visible:ring-0"
                disabled={isStreaming || isContextPending}
                rows={1}
              />

              {isStreaming ? (
                <Button
                  onClick={handleStop}
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span className="sr-only">Stop generating</span>
                </Button>
              ) : (
                <Button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || isContextPending}
                  size="icon"
                  className={cn(
                    "h-9 w-9 shrink-0 rounded-full transition-opacity",
                    input.trim() ? "opacity-100" : "opacity-60"
                  )}
                >
                  <ArrowUp className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-2 text-center text-[11px] text-muted-foreground">
            AI Mentor can make mistakes. Verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}
