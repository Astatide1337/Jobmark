"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  Pen,
  BarChart3,
  FolderOpen,
  FileText,
  Settings,
  MessageSquare,
  Coffee,
  Users,
  Plus,
  Target,
  Briefcase,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createConversation,
  deleteConversation,
  renameConversation,
  type ConversationData,
  type ConversationMode,
} from "@/app/actions/chat";

const navItems = [
  { href: "/dashboard", icon: Pen, label: "Journal", demoId: "journal" },
  { href: "/chat", icon: MessageSquare, label: "Mentor", demoId: "feature-mentor" },
  { href: "/projects", icon: FolderOpen, label: "Projects", demoId: "feature-projects" },
  { href: "/reports", icon: FileText, label: "Reports", demoId: "feature-reports" },
  { href: "/insights", icon: BarChart3, label: "Insights", demoId: "feature-insights" },
  { href: "/focus", icon: Coffee, label: "Focus", demoId: "feature-focus" },
  { href: "/network", icon: Users, label: "Network", demoId: "feature-network" },
];

const settingsItem = { href: "/settings", icon: Settings, label: "Settings", demoId: "settings" };

interface SidebarProps {
  mode?: "app" | "demo";
  activePath?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  chatSidebarData?: {
    conversations: ConversationData[];
    activeConversationId?: string;
    projects: Array<{ id: string; name: string; color: string }>;
  };
}

export function Sidebar({ mode = "app", activePath = "/", isMobileOpen, onMobileClose, chatSidebarData }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = mode === "demo" ? activePath : pathname;
  const [viewMode, setViewMode] = useState<"history" | "navigation">("history");
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const isChatRoute = mode === "app" && currentPath?.startsWith("/chat");

  const handleNewChat = async (chatMode: ConversationMode, projectId?: string) => {
    startTransition(async () => {
      const conversation = await createConversation(chatMode, projectId);
      onMobileClose?.();
      router.push(`/chat/${conversation.id}`);
    });
  };

  const handleDelete = async (conversationId: string) => {
    startTransition(async () => {
      await deleteConversation(conversationId);
      if (chatSidebarData?.activeConversationId === conversationId) {
        onMobileClose?.();
        router.push("/chat");
      }
    });
  };

  const handleStartRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingId || !editTitle.trim()) {
      setEditingId(null);
      return;
    }
    startTransition(async () => {
      await renameConversation(editingId, editTitle.trim());
      setEditingId(null);
    });
  };

  const getChatModeLabel = (chatMode: string) => {
    switch (chatMode) {
      case "goal-coach":
        return "Goal Setting";
      case "interview":
        return "Interview";
      default:
        return "Chat";
    }
  };

  const getChatModeIcon = (chatMode: string) => {
    switch (chatMode) {
      case "goal-coach":
        return <Target className="h-4 w-4" />;
      case "interview":
        return <Briefcase className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleDemoClick = (id: string) => {
    if (mode === "demo") {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };


  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 flex-col border-r border-border/50 bg-sidebar transition-transform duration-300 lg:static lg:flex lg:w-64 lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        mode === "app" ? "lg:sticky lg:top-0 h-screen overflow-y-auto" : "h-full"
      )}>
      <div className="p-6">
        {mode === "app" ? (
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Pen className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground">Jobmark</span>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Pen className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground">Jobmark</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 min-h-0">
        {isChatRoute && viewMode === "history" && chatSidebarData ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="space-y-2 pb-3">
              <Button
                onClick={() => handleNewChat("general")}
                disabled={isPending}
                className="w-full justify-start"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Chat
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNewChat("goal-coach")}
                  disabled={isPending}
                  className="justify-start text-xs"
                >
                  <Target className="mr-1 h-3 w-3" />
                  Goal
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending || chatSidebarData.projects.length === 0}
                      className="justify-start text-xs"
                    >
                      <Briefcase className="mr-1 h-3 w-3" />
                      Interview
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <div className="p-2 text-xs font-medium text-muted-foreground">
                      Select a project to practice
                    </div>
                    {chatSidebarData.projects.map((project) => (
                      <DropdownMenuItem
                        key={project.id}
                        onClick={() => handleNewChat("interview", project.id)}
                        className="cursor-pointer"
                      >
                        <span
                          className="mr-2 h-2 w-2 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">Recent Chats</div>
            <div className="flex-1 overflow-y-auto pr-1" data-lenis-prevent>
              {chatSidebarData.conversations.length === 0 ? (
                <div className="px-2 py-8 text-sm text-muted-foreground">
                  No conversations yet.
                </div>
              ) : (
                chatSidebarData.conversations.map((conversation) => (
                  <div key={conversation.id} className="group mb-1">
                    <Link
                      href={`/chat/${conversation.id}`}
                      onClick={() => onMobileClose?.()}
                      className={cn(

                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        chatSidebarData.activeConversationId === conversation.id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      <span className="shrink-0">{getChatModeIcon(conversation.mode)}</span>
                      <div className="min-w-0 flex-1">
                        {editingId === conversation.id ? (
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleRenameSubmit();
                            }} 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => handleRenameSubmit()}
                              autoFocus
                              className="h-6 w-full px-1 py-0 text-xs"
                            />
                          </form>
                        ) : (
                          <div className="truncate font-medium">{conversation.title}</div>
                        )}
                        <div className="truncate text-xs text-muted-foreground">
                          {getChatModeLabel(conversation.mode)}
                        </div>
                      </div>


                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStartRename(conversation.id, conversation.title);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(conversation.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          navItems.map((item) => (
            <NavItem
              key={item.href}
              mode={mode}
              href={item.href}
              demoId={item.demoId}
              icon={item.icon}
              label={item.label}
              isActive={mode === "app"
                ? (currentPath === item.href || currentPath?.startsWith(item.href + "/"))
                : (item.label === "Journal" && currentPath === "/dashboard") ||
                (item.label === "Mentor" && currentPath === "/mentor") ||
                currentPath?.includes(item.label.toLowerCase())
              }
              onClick={mode === "demo" ? () => handleDemoClick(item.demoId) : () => onMobileClose?.()}
            />
          ))
        )}
      </nav>
      {isChatRoute && chatSidebarData && (
        <button
          type="button"
          onClick={() =>
            setViewMode((prev) => (prev === "history" ? "navigation" : "history"))
          }
          className="mb-2 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {viewMode === "history" ? "Switch to navigation" : "Switch to chat history"}
        </button>
      )}
      <div className="p-3 border-t border-border/50">
        <NavItem
          mode={mode}
          href={settingsItem.href}
          demoId={settingsItem.demoId}
          icon={settingsItem.icon}
          label={settingsItem.label}
          isActive={currentPath === settingsItem.href}
          onClick={mode === "demo" ? () => { } : () => onMobileClose?.()}
        />
      </div>
    </aside>
    </>
  );
}

function NavItem({
  mode = "app",
  href,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  mode?: "app" | "demo";
  href: string;
  demoId: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      {/* Active background indicator with animation */}
      {isActive && (
        <motion.div
          layoutId={mode === "demo" ? "demo-sidebar-active" : "sidebar-active"}
          className="absolute inset-0 bg-sidebar-accent rounded-lg"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}

      <Icon className="relative z-10 h-4 w-4" />
      <span className="relative z-10">
        {label}
      </span>
    </>
  );

  const className = cn(
    "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1",
    isActive
      ? "text-sidebar-accent-foreground"
      : "text-muted-foreground hover:text-foreground"
  );

  if (mode === "demo") {
    return (
      <button
        onClick={onClick}
        className={cn(className, "w-full text-left")}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
