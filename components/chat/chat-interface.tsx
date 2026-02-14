"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { readStreamableValue } from "@ai-sdk/rsc";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Bot, Sparkles, Square, ArrowUp, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  streamChatMessage,
  type MessageData,
  type ConversationMode,
} from "@/app/actions/chat";
import { ChatMessage } from "./chat-message";
import { ContextSelector } from "./context-selector";

interface ChatInterfaceProps {
  conversationId: string;
  mode: ConversationMode;
  initialMessages: MessageData[];
  projectId: string | null;
  goalId: string | null;
  contactId: string | null;
  projects: Array<{ id: string; name: string; color: string }>;
  goals: Array<{ id: string; title: string }>;
  contacts: Array<{ id: string; fullName: string; relationship: string | null; interactionsCount: number }>;
  onContextChange?: (
    projectId?: string | null,
    goalId?: string | null,
    contactId?: string | null
  ) => void;
}

export function ChatInterface({
  conversationId,
  mode,
  initialMessages,
  projectId,
  goalId,
  contactId,
  projects,
  goals,
  contacts,
  onContextChange,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageData[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortStreamRef = useRef(false);

  // Scroll to bottom when messages change
  // We use "behavior: auto" for streaming to prevent jitter, smooth otherwise
  useEffect(() => {
    if (streamingContent) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleStop = () => {
    abortStreamRef.current = true;
    setIsStreaming(false);
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isStreaming) return;

    abortStreamRef.current = false;

    // Add user message to UI immediately
    const userMessage: MessageData = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: trimmedInput,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    startTransition(async () => {
      try {
        const { output } = await streamChatMessage(conversationId, trimmedInput);

        let fullContent = "";
        for await (const delta of readStreamableValue(output)) {
          if (abortStreamRef.current) break;
          if (delta) {
            fullContent += delta;
            setStreamingContent(fullContent);
          }
        }

        const assistantMessage: MessageData = {
          id: `temp-assistant-${Date.now()}`,
          role: "assistant",
          content: fullContent,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent("");
      } catch (error) {
        console.error("Failed to send message:", error);
        const errorMessage: MessageData = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsStreaming(false);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getWelcomeMessage = () => {
    switch (mode) {
      case "goal-coach":
        return {
          title: "Goal Mentoring Session",
          description: "Let's work through Brian Tracy's 7-step goal-setting method together. Start by telling me what you want to achieve.",
        };
      case "interview":
        return {
          title: "Mock Interview Practice",
          description: "I'll conduct a mock interview based on your project work. Ready when you are – just say \"start\" to begin!",
        };
      default:
        return {
          title: "Career Mentor",
          description: "I'm here to help with career guidance, overcoming self-doubt, and thinking through your professional goals. What's on your mind?",
        };
    }
  };

  const welcome = getWelcomeMessage();

  return (
    <div className="flex flex-col h-full relative bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto w-full" data-lenis-prevent>
        <div className="max-w-3xl mx-auto px-4 pt-6 pb-40 min-h-full flex flex-col justify-end">
          {/* Welcome Message */}
          {messages.length === 0 && !streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 flex-1 flex flex-col justify-center items-center"
            >
              <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 shadow-sm border border-primary/10">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">{welcome.title}</h2>
              <p className="text-muted-foreground max-w-md mx-auto text-lg leading-relaxed">{welcome.description}</p>
            </motion.div>
          )}

          {/* Message List */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout" initial={false}>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </AnimatePresence>

            {/* Streaming Assistant Message */}
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
            
            <div ref={messagesEndRef} className="h-px" />
          </div>
        </div>
      </div>

      {/* Floating Input Area */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        {/* Gradient Fade */}
        <div className="absolute inset-0 top-[-50px] bg-gradient-to-t from-background via-background/90 to-transparent h-[200px]" />
        
        <div className="pointer-events-auto max-w-3xl mx-auto px-4 pb-6 relative">
          {/* Scroll to bottom button could go here */}
          
          <div className="bg-muted/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-[32px] p-2 transition-all duration-300 focus-within:bg-muted/60 focus-within:shadow-primary/5">
            {/* Context Chips (Inside top) */}
            <div className="px-4 py-2 border-b border-white/5 mb-1">
              <ContextSelector
                projects={projects}
                goals={goals}
                contacts={contacts}
                selectedProjectId={projectId}
                selectedGoalId={goalId}
                selectedContactId={contactId}
                onProjectSelect={(id) => onContextChange?.(id, goalId)}
                onGoalSelect={(id) => onContextChange?.(projectId, id)}
                onContactSelect={(id) => onContextChange?.(projectId, goalId, id)}
              />
            </div>
            
            <div className="flex items-end gap-2 pl-4 pr-2 pb-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === "goal-coach"
                    ? "Describe your goal..."
                    : mode === "interview"
                    ? "Type your answer..."
                    : "Ask your mentor..."
                }
                className="min-h-[24px] max-h-[200px] w-full resize-none bg-transparent border-none shadow-none focus-visible:ring-0 px-2 py-3 text-base placeholder:text-muted-foreground/50"
                disabled={isStreaming}
                rows={1}
              />
              
              {isStreaming ? (
                <Button
                  onClick={handleStop}
                  variant="default"
                  size="icon"
                  className="h-10 w-10 rounded-full shrink-0 bg-primary/10 hover:bg-destructive text-primary hover:text-destructive-foreground transition-all duration-300"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span className="sr-only">Stop generating</span>
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-full shrink-0 transition-all duration-300",
                    input.trim() 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <ArrowUp className="h-5 w-5" />
                  <span className="sr-only">Send</span>
                </Button>
              )}
            </div>
          </div>
          
          <div className="text-center text-[10px] text-muted-foreground/60 mt-4 font-medium tracking-wide">
            AI Mentor can make mistakes. Verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}
