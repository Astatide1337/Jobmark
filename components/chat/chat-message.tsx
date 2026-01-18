"use client";

import { motion } from "framer-motion";
import { Bot, User, Copy, Check, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageData } from "@/app/actions/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState, useEffect, useRef } from "react";

interface ChatMessageProps {
  message: MessageData;
  isStreaming?: boolean;
}

// Typewriter hook for smooth streaming
function useTypewriter(content: string, isStreaming?: boolean, speed = 10) {
  const [displayedContent, setDisplayedContent] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    // If not streaming, show full content immediately
    if (!isStreaming) {
      setDisplayedContent(content);
      indexRef.current = content.length;
      return;
    }

    const interval = setInterval(() => {
      if (indexRef.current < content.length) {
        // dynamic speed based on queue length to prevent lag behind
        const queue = content.length - indexRef.current;
        const increment = queue > 50 ? 5 : queue > 20 ? 2 : 1;
        
        indexRef.current += increment;
        setDisplayedContent(content.slice(0, indexRef.current));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content, isStreaming, speed]);

  return displayedContent;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";
  const content = useTypewriter(message.content, isStreaming);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn(
        "flex gap-4 w-full max-w-3xl mx-auto mb-8",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-background border border-border/50 text-primary"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex-1 overflow-hidden",
          isUser ? "flex justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "relative",
            isUser
              ? "bg-muted/80 text-foreground px-5 py-3.5 rounded-3xl rounded-tr-sm border border-border/50"
              : "px-1 py-1" // minimal wrapper for AI
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {message.content}
            </div>
          ) : (
            <div className="text-[15px] leading-7 prose prose-neutral dark:prose-invert max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: { node?: any; inline?: boolean; className?: string; children?: React.ReactNode; [key: string]: any }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const [isCopied, setIsCopied] = useState(false);

                    const handleCopy = () => {
                      navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    };

                    if (!inline && match) {
                      return (
                        <div className="relative group rounded-xl overflow-hidden my-6 border border-border/50 shadow-sm bg-card">
                          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                              <Terminal className="h-3 w-3" />
                              <span>{match[1]}</span>
                            </div>
                            <button
                              onClick={handleCopy}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isCopied ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              {isCopied ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <SyntaxHighlighter
                            {...props}
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderRadius: 0,
                              background: "transparent",
                              padding: "1.5rem",
                              fontSize: "0.875rem",
                              lineHeight: "1.6",
                            }}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    return (
                      <code
                        className={cn(
                          "bg-muted/50 px-1.5 py-0.5 rounded-md font-mono text-[0.9em] border border-border/50 text-foreground",
                          className
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  ul: ({ children }) => <ul className="list-disc pl-5 space-y-2 mb-6 text-muted-foreground marker:text-primary/50">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2 mb-6 text-muted-foreground marker:text-primary/50">{children}</ol>,
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  p: ({ children }) => <p className="mb-4 last:mb-0 text-foreground/90 font-normal">{children}</p>,
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity font-medium decoration-primary/30"
                    >
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/20 pl-6 italic text-muted-foreground/80 my-6 text-lg">
                      {children}
                    </blockquote>
                  ),
                  h1: ({ children }) => <h1 className="text-2xl font-semibold mt-8 mb-4 first:mt-0 tracking-tight text-foreground">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-semibold mt-8 mb-3 first:mt-0 tracking-tight text-foreground">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-semibold mt-6 mb-2 first:mt-0 text-foreground">{children}</h3>,
                  hr: () => <hr className="my-8 border-border/50" />,
                }}
              >
                {content}
              </ReactMarkdown>
              
              {/* Cursor */}
              {isStreaming && (
                <span className="inline-block w-2 h-5 ml-1 align-middle bg-primary/70 animate-pulse rounded-full" />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
