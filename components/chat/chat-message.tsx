"use client";

import { Bot, Copy, Check, Terminal, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageData } from "@/app/actions/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";

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
    <div className="my-5 overflow-hidden rounded-xl border border-border/70 bg-card/80 ring-1 ring-white/5 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-2 bg-muted/20">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
          <Terminal className="h-3.5 w-3.5" />
          <span className="uppercase tracking-widest">{language}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground font-medium"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: "transparent",
          padding: "1.25rem",
          fontSize: "0.85rem",
          lineHeight: "1.6",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export function ChatMessage({ message, isStreaming, isLast, onRegenerate }: ChatMessageProps) {
  const isUser = message.role === "user";
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
        "mx-auto flex w-full max-w-3xl animate-in fade-in duration-500",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {isUser ? (
        <div className="group relative max-w-[75%]">
          <div
            className="rounded-[1.5rem] rounded-tr-sm bg-muted/40 px-5 py-3.5 text-[15px] leading-relaxed text-foreground/90 backdrop-blur-sm ring-1 ring-white/5 shadow-sm"
          >
            {content}
          </div>
          <button
            onClick={handleCopy}
            className="absolute -left-12 top-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 text-muted-foreground/40 hover:text-primary hover:scale-110"
            title="Copy message"
          >
            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <div className="flex w-full max-w-full gap-5 group">
          <div className="mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20 shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          
          <div className="min-w-0 flex-1 py-1">
            <div className="prose prose-neutral dark:prose-invert max-w-none break-words text-[16px] leading-[1.8] text-foreground/90 selection:bg-primary/20">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const rawCode = String(children ?? "");
                    const match = /language-(\w+)/.exec(className || "");
                    const isBlock = Boolean(match) || rawCode.includes("\n");

                    if (isBlock) {
                      return (
                        <CodeBlock
                          language={match?.[1] ?? "text"}
                          code={rawCode.replace(/\n$/, "")}
                        />
                      );
                    }

                    return (
                      <code
                        className={cn(
                          "rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground font-medium",
                          className
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => (
                    <p className="mb-4 last:mb-0 text-foreground/95 font-normal leading-7">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-5 list-disc space-y-2 pl-5 marker:text-primary/60">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-5 list-decimal space-y-2 pl-5 marker:text-primary/60">{children}</ol>
                  ),
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-all"
                    >
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-5 border-l-4 border-primary/20 pl-5 italic text-muted-foreground/80 text-lg">
                      {children}
                    </blockquote>
                  ),
                  h1: ({ children }) => (
                    <h1 className="mb-4 mt-8 text-2xl font-semibold tracking-tight first:mt-0 font-serif text-foreground">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-8 text-xl font-semibold tracking-tight first:mt-0 font-serif text-foreground">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-2 mt-6 text-lg font-semibold tracking-tight first:mt-0 text-foreground">{children}</h3>
                  ),
                  hr: () => <hr className="my-8 border-border/40" />,
                  table: ({ children }) => (
                    <div className="my-6 w-full overflow-y-auto rounded-lg border border-border/60">
                      <table className="w-full text-left text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/40 font-medium">{children}</thead>
                  ),
                  tbody: ({ children }) => <tbody className="divide-y divide-border/40">{children}</tbody>,
                  tr: ({ children }) => <tr className="transition-colors hover:bg-muted/20">{children}</tr>,
                  th: ({ children }) => (
                    <th className="px-4 py-3 font-semibold text-foreground/80">{children}</th>
                  ),
                  td: ({ children }) => <td className="px-4 py-3 align-top">{children}</td>,
                }}
              >
                {content}
              </ReactMarkdown>
              
              {isStreaming && (
                <div className="mt-2 inline-flex items-center gap-1.5 py-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" />
                </div>
              )}
            </div>
            
            <div className="mt-4 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{isCopied ? "Copied" : "Copy"}</span>
              </button>
              
              {isLast && !isStreaming && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
