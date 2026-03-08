'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <div className="text-muted-foreground space-y-5 text-base leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ ...props }) => (
              <h2
                className="text-foreground mt-10 mb-4 font-serif text-[1.75rem] leading-tight"
                {...props}
              />
            ),
            h3: ({ ...props }) => (
              <h3
                className="text-foreground mt-10 mb-4 font-serif text-[1.4rem] leading-tight"
                {...props}
              />
            ),
            h4: ({ ...props }) => (
              <h4
                className="text-foreground mt-10 mb-4 font-serif text-[1.2rem] leading-tight"
                {...props}
              />
            ),
            p: ({ ...props }) => <p className="text-foreground/85" {...props} />,
            a: ({ ...props }) => (
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary decoration-primary/50 font-medium underline underline-offset-3"
                {...props}
              />
            ),
            strong: ({ ...props }) => <strong className="text-foreground font-bold" {...props} />,
            ul: ({ ...props }) => <ul className="ml-4 list-disc space-y-2 pl-4" {...props} />,
            ol: ({ ...props }) => <ol className="ml-4 list-decimal space-y-2 pl-4" {...props} />,
            li: ({ ...props }) => <li className="mt-1" {...props} />,
            table: ({ ...props }) => (
              <table className="mt-5 mb-5 w-full border-collapse text-sm" {...props} />
            ),
            th: ({ ...props }) => (
              <th
                className="border-border text-foreground border-b px-3 py-3 text-left font-semibold"
                {...props}
              />
            ),
            td: ({ ...props }) => (
              <td className="border-border border-b px-3 py-3 text-left" {...props} />
            ),
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              const value = String(children).replace(/\n$/, '');
              const isBlock = !!match || value.includes('\n');

              if (!isBlock) {
                return (
                  <code
                    className="bg-foreground/10 rounded px-1.5 py-0.5 font-mono text-[0.9em]"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match?.[1] || 'text'}
                  PreTag="div"
                  customStyle={{
                    margin: '1rem 0',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    fontSize: '0.9rem',
                  }}
                >
                  {value}
                </SyntaxHighlighter>
              );
            },
            blockquote: ({ ...props }) => (
              <blockquote
                className="border-primary/60 text-foreground/95 my-8 border-l-2 pl-5 font-serif text-xl leading-relaxed"
                {...props}
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
