import { DashboardFrame } from "./dashboard-frame";
import { cn } from "@/lib/utils";
import { Bot, User, ArrowUp } from "lucide-react";
import { ContextSelector } from "@/components/chat/context-selector";

export function DemoChat() {
  const mockProjects = [
    { id: "1", name: "Website Redesign", color: "#6366f1" },
    { id: "2", name: "Mobile App MVP", color: "#10b981" },
  ];

  return (
    <DashboardFrame activePath="/mentor">
      <div className="h-full flex flex-col bg-background relative">
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto w-full p-4 space-y-6 pb-40">
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
          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
            <div className="absolute inset-0 top-[-50px] bg-gradient-to-t from-background via-background/90 to-transparent h-[200px]" />
            
            <div className="pointer-events-auto px-4 pb-6 relative">
              <div className="bg-muted/40 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-[32px] p-2 transition-all duration-300">
                 {/* Context Chips */}
                 <div className="px-4 py-2 border-b border-white/5 mb-1">
                    <ContextSelector 
                        projects={mockProjects} 
                        goals={[]} 
                        selectedProjectId="1" 
                        selectedGoalId={null} 
                        onProjectSelect={() => {}} 
                        onGoalSelect={() => {}}
                    />
                 </div>

                 <div className="flex items-end gap-2 pl-4 pr-2 pb-2">
                   <div className="flex-1 py-3 text-base text-muted-foreground/50">
                      Type a message...
                   </div>
                   <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center shrink-0">
                        <ArrowUp className="h-5 w-5" />
                   </div>
                 </div>
              </div>
               <div className="text-center text-[10px] text-muted-foreground/60 mt-4 font-medium tracking-wide">
                AI Mentor can make mistakes. Verify important information.
              </div>
            </div>
          </div>
      </div>
    </DashboardFrame>
  );
}

function MockChatMessage({ role, content }: { role: "user" | "assistant", content: string }) {
   const isUser = role === "user";
   return (
    <div className={cn("flex gap-4 w-full mb-4", isUser ? "flex-row-reverse" : "flex-row")}>
         {/* Avatar */}
      <div
        className={cn(
          "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-background border border-border/50 text-primary"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

       {/* Content */}
       <div className={cn("flex-1 overflow-hidden", isUser ? "flex justify-end" : "justify-start")}>
            <div className={cn(
                "relative text-sm leading-relaxed",
                 isUser
                ? "bg-muted/80 text-foreground px-5 py-3.5 rounded-3xl rounded-tr-sm border border-border/50 max-w-[85%]"
                : "px-1 py-1 max-w-[90%]"
            )}>
                <p className="whitespace-pre-wrap">{content}</p>
            </div>
       </div>
    </div>
   )
}
