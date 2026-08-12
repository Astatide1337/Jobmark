/**
 * Connected AI app demo
 *
 * Why: Visualizes the handoff between a Jobmark brief and the AI app the
 * user already trusts. It does not represent an internal Jobmark chat.
 *
 * Implementation: Uses static "Mock" messages and mock context chips
 * to ensure the landing page stays lightweight and fast.
 */
import { DashboardFrame } from './dashboard-frame';
import { cn } from '@/lib/utils';
import { Bot, User, ArrowUp, X } from 'lucide-react';

export function DemoChat() {
  return (
    <div aria-hidden="true" className="h-full">
      <DashboardFrame activePath="/chat">
        <div className="bg-background relative flex h-full flex-col">
          {/* Messages Area */}
          <div className="w-full flex-1 space-y-6 overflow-y-auto p-4 pb-40">
            <MockChatMessage
              role="user"
              content="Turn this week's work into a manager-ready update."
            />
            <MockChatMessage
              role="assistant"
              content="Your Jobmark brief includes the work you shipped, the outcomes you recorded, and the details worth highlighting. Your connected AI app can now turn it into a polished update."
            />
            <MockChatMessage role="user" content="Open it in my connected AI app." />
          </div>

          {/* Floating Input Area */}
          <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-20">
            <div className="from-background via-background/90 absolute inset-0 top-[-50px] h-[200px] bg-gradient-to-t to-transparent" />

            <div className="pointer-events-auto relative px-4 pb-6">
              <div className="bg-muted/40 rounded-[32px] border border-white/10 p-2 shadow-2xl backdrop-blur-2xl transition-all duration-300">
                {/* Context Chips (mock) */}
                <div className="mb-1 flex flex-wrap gap-1 border-b border-white/5 px-4 py-2">
                  <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    Jobmark record · 7 days
                    <X className="h-3 w-3" />
                  </span>
                </div>

                <div className="flex items-end gap-2 pr-2 pb-2 pl-4">
                  <div className="text-muted-foreground/50 flex-1 py-3 text-base">
                    Ready-to-send brief...
                  </div>
                  <div className="bg-primary text-primary-foreground shadow-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg">
                    <ArrowUp className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="text-muted-foreground/60 mt-4 text-center text-[10px] font-medium tracking-wide">
                Review the result before you send it.
              </div>
            </div>
          </div>
        </div>
      </DashboardFrame>
    </div>
  );
}

function MockChatMessage({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={cn('mb-4 flex w-full gap-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-background border-border/50 text-primary border'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn('flex-1 overflow-hidden', isUser ? 'flex justify-end' : 'justify-start')}>
        <div
          className={cn(
            'relative text-sm leading-relaxed',
            isUser
              ? 'bg-muted/80 text-foreground border-border/50 max-w-[85%] rounded-3xl rounded-tr-sm border px-5 py-3.5'
              : 'max-w-[90%] px-1 py-1'
          )}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
}
