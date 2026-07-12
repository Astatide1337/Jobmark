'use client';

import { useState } from 'react';
import { Bot, Check, Copy, RotateCw, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import type { MessageData } from '@/app/actions/chat';

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

export function ChatMessage({ message, isStreaming, isLast, onRegenerate }: ChatMessageProps) {
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
