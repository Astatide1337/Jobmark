"use client";

import { Bot, Copy, Check, Terminal } from "lucide-react";
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
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-border/70 bg-card/80">
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Terminal className="h-3 w-3" />
          <span className="uppercase tracking-wide">{language}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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
          padding: "1rem",
          fontSize: "0.82rem",
          lineHeight: "1.5",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";
  const content = message.content;

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-3xl",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {isUser ? (
        <div
          className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-border/70 bg-muted/70 px-4 py-3 text-sm leading-6 text-foreground"
        >
          {content}
        </div>
      ) : (
        <div className="flex w-full max-w-full gap-3">
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-primary">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="prose prose-sm prose-neutral max-w-none break-words text-sm leading-6 text-foreground dark:prose-invert">
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
                          "rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em]",
                          className
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => (
                    <p className="mb-4 last:mb-0 text-foreground/95">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-4 list-disc space-y-1.5 pl-5">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-4 list-decimal space-y-1.5 pl-5">{children}</ol>
                  ),
                  li: ({ children }) => <li>{children}</li>,
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-4"
                    >
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                  h1: ({ children }) => (
                    <h1 className="mb-3 mt-6 text-xl font-semibold first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-6 text-lg font-semibold first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-2 mt-5 text-base font-semibold first:mt-0">{children}</h3>
                  ),
                  hr: () => <hr className="my-6 border-border/70" />,
                }}
              >
                {content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block h-4 w-1 animate-pulse rounded-full bg-primary/70 align-middle" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
