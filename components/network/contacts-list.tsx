"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Users, UserPlus, MessageSquare, Calendar, Mail, Phone } from "lucide-react";
import { ContactDialog } from "./contact-dialog";
import { getAgeFromBirthday } from "@/lib/network";

interface Contact {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  relationship?: string | null;
  birthday?: Date | null;
  createdAt: Date;
  _count: {
    interactions: number;
  };
}

interface ContactsListProps {
  contacts: Contact[];
  stats: {
    totalContacts: number;
    interactionsThisMonth: number;
    followUpsDue: number;
  };
}

export function ContactsList({ contacts, stats }: ContactsListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "recent" | "interactions">("name");

  const filteredContacts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter((c) => {
      return (
        c.fullName.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.relationship && c.relationship.toLowerCase().includes(query))
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortBy === "recent") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "interactions") {
        return b._count.interactions - a._count.interactions;
      }
      return 0;
    });
  }, [contacts, searchQuery, sortBy]);

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalContacts}</p>
              <p className="text-xs text-muted-foreground">Total Contacts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.interactionsThisMonth}</p>
              <p className="text-xs text-muted-foreground">Interactions This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.followUpsDue}</p>
              <p className="text-xs text-muted-foreground">Follow-ups Due</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="interactions">Most Interactions</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateDialog(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Contact Grid or Empty State */}
      {contacts.length === 0 ? (
        <Card className="bg-card/50 border-border/50 border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No contacts yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              Start building your professional network. Add contacts to track
              interactions and nurture relationships.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Your First Contact
            </Button>
          </CardContent>
        </Card>
      ) : filteredContacts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground italic">
          No contacts match your search.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => {
            const age = getAgeFromBirthday(contact.birthday);
            return (
              <Card
                key={contact.id}
                className="cursor-pointer transition-colors hover:border-primary/30 hover:shadow-md"
                onClick={() => router.push(`/network/${contact.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {contact.fullName}
                      </CardTitle>
                      {contact.relationship && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {contact.relationship}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 ml-2">
                      {contact._count.interactions} {contact._count.interactions === 1 ? "interaction" : "interactions"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {contact.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {age !== undefined && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Age {age}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <ContactDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
