/**
 * Interactive Chat Demo
 *
 * Why: Visualizes the AI Mentor's value proposition. It showcases
 * how the mentor uses logged activities to provide specific,
 * evidence-based coaching.
 *
 * Implementation: Uses static "Mock" messages and a non-functional
 * version of the `ContextSelector` to ensure the landing page stays
 * lightweight and fast.
 */
import { DashboardFrame } from './dashboard-frame';
import { cn } from '@/lib/utils';
import { Bot, User, ArrowUp } from 'lucide-react';
import { ContextSelector } from '@/components/chat/context-selector';

export function DemoChat() {
  const mockProjects = [
    { id: '1', name: 'Website Redesign', color: '#6366f1' },
    { id: '2', name: 'Mobile App MVP', color: '#10b981' },
  ];

  return (
    <DashboardFrame activePath="/mentor">
      <div className="bg-background relative flex h-full flex-col">
        {/* Messages Area */}
        <div className="w-full flex-1 space-y-6 overflow-y-auto p-4 pb-40">
          <MockChatMessage
            role="user"
            content="I feel like I'm not making enough progress on the big project."
          />
          <MockChatMessage
            role="assistant"
            content="It looks like you've logged 12 activities this week related to the project. That's actually consistent progress! \n\nTry breaking down the next milestone into smaller tasks to feel that sense of completion more often."
          />
          <MockChatMessage
            role="user"
            content="That's a good point. I'll break down the API work."
          />
        </div>

        {/* Floating Input Area (mimicking ChatInterface) */}
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-20">
          <div className="from-background via-background/90 absolute inset-0 top-[-50px] h-[200px] bg-gradient-to-t to-transparent" />

          <div className="pointer-events-auto relative px-4 pb-6">
            <div className="bg-muted/40 rounded-[32px] border border-white/10 p-2 shadow-2xl backdrop-blur-2xl transition-all duration-300">
              {/* Context Chips */}
              <div className="mb-1 border-b border-white/5 px-4 py-2">
                <ContextSelector
                  projects={mockProjects}
                  goals={[]}
                  reports={[]}
                  selectedProjectIds={['1']}
                  selectedGoalIds={[]}
                  selectedContactIds={[]}
                  selectedReportIds={[]}
                  onProjectSelect={() => {}}
                  onGoalSelect={() => {}}
                  onContactSelect={() => {}}
                  onReportSelect={() => {}}
                  onProjectRemove={() => {}}
                  onGoalRemove={() => {}}
                  onContactRemove={() => {}}
                  onReportRemove={() => {}}
                  onOpenContextModal={() => {}}
                />
              </div>

              <div className="flex items-end gap-2 pr-2 pb-2 pl-4">
                <div className="text-muted-foreground/50 flex-1 py-3 text-base">
                  Type a message...
                </div>
                <div className="bg-primary text-primary-foreground shadow-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg">
                  <ArrowUp className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="text-muted-foreground/60 mt-4 text-center text-[10px] font-medium tracking-wide">
              AI Mentor can make mistakes. Verify important information.
            </div>
          </div>
        </div>
      </div>
    </DashboardFrame>
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
