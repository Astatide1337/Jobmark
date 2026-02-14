"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MessageSquare,
  Target,
  Briefcase,
  MoreHorizontal,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createConversation,
  deleteConversation,
  renameConversation,
  type ConversationData,
  type ConversationMode,
} from "@/app/actions/chat";

interface ChatSidebarProps {
  conversations: ConversationData[];
  activeConversationId?: string;
  projects: Array<{ id: string; name: string; color: string }>;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  projects,
}: ChatSidebarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleNewChat = async (mode: ConversationMode, projectId?: string) => {
    startTransition(async () => {
      try {
        const conversation = await createConversation(mode, projectId);
        router.push(`/chat/${conversation.id}`);
      } catch (error) {
        console.error("Failed to create conversation:", error);
      }
    });
  };

  const handleDelete = async (conversationId: string) => {
    setDeletingId(conversationId);
    startTransition(async () => {
      try {
        await deleteConversation(conversationId);
        if (activeConversationId === conversationId) {
          router.push("/chat");
        }
        router.refresh();
      } catch (error) {
        console.error("Failed to delete conversation:", error);
      } finally {
        setDeletingId(null);
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
      try {
        await renameConversation(editingId, editTitle.trim());
        setEditingId(null);
      } catch (error) {
        console.error("Failed to rename conversation:", error);
      }
    });
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "goal-coach":
        return <Target className="h-4 w-4" />;
      case "interview":
        return <Briefcase className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case "goal-coach":
        return "Goal Setting";
      case "interview":
        return "Interview";
      default:
        return "Chat";
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-2xl overflow-hidden">
      {/* New Chat Buttons */}
      <div className="p-4 space-y-2">
        <Button
          onClick={() => handleNewChat("general")}
          disabled={isPending}
          className="w-full justify-start"
        >
          <Plus className="h-4 w-4 mr-2" />
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
            <Target className="h-3 w-3 mr-1" />
            Goal Mentor
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending || projects.length === 0}
                className="justify-start text-xs"
              >
                <Briefcase className="h-3 w-3 mr-1" />
                Interview
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="p-2 text-xs font-medium text-muted-foreground">
                Select a project to practice
              </div>
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => handleNewChat("interview", project.id)}
                  className="cursor-pointer"
                >
                  <span
                    className="h-2 w-2 rounded-full mr-2"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4" data-lenis-prevent>
        <div className="text-xs font-medium text-muted-foreground px-2 mb-2">
          Recent Chats
        </div>
        
        {conversations.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-muted-foreground">
            No conversations yet.
            <br />
            Start a new chat above!
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {conversations.map((conversation) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="group w-full"
              >
                <Link
                  href={`/chat/${conversation.id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 w-full",
                    activeConversationId === conversation.id
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0",
                      activeConversationId === conversation.id
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {getModeIcon(conversation.mode)}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    {editingId === conversation.id ? (
                      <form onSubmit={handleRenameSubmit} onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleRenameSubmit()}
                          autoFocus
                          className="h-6 text-xs px-1 py-0 my-0.5 w-full"
                        />
                      </form>
                    ) : (
                      <div className="truncate font-medium">{conversation.title}</div>
                    )}
                    
                    <div className="text-xs text-muted-foreground truncate">
                      {getModeLabel(conversation.mode)}
                      {conversation.project && (
                        <> · {conversation.project.name}</>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-6 w-6 p-0"
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
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(conversation.id);
                          }}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
