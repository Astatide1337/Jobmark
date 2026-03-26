/**
 * Contacts List & Toolbar
 *
 * Why: Provides the high-level view of a user's professional network.
 * It includes real-time search, multi-criteria sorting, and key metrics.
 *
 * Feature Highlight:
 * - Search: Deep-filters through names, emails, and relationship descriptions.
 * - Sorting: Allows prioritizing by "Most Recent" or "Most Interactions"
 *   to help users identify relationships that need nurturing.
 */
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Users, UserPlus, MessageSquare, Calendar, Mail, Phone } from 'lucide-react';
import { ContactDialog } from '@/components/network/contact-dialog';
import { getAgeFromBirthday } from '@/lib/network';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'interactions'>('name');

  const filteredContacts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(c => {
      return (
        c.fullName.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.relationship && c.relationship.toLowerCase().includes(query))
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'interactions') {
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <Users className="text-primary h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalContacts}</p>
              <p className="text-muted-foreground text-xs">Total Contacts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.interactionsThisMonth}</p>
              <p className="text-muted-foreground text-xs">Interactions This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.followUpsDue}</p>
              <p className="text-muted-foreground text-xs">Follow-ups Due</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <div className="relative w-full flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
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
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Contact Grid or Empty State */}
      {contacts.length === 0 ? (
        <Card className="bg-card/50 border-border/50 rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
              <UserPlus className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-foreground mb-2 font-semibold">No contacts yet</h3>
            <p className="text-muted-foreground mx-auto mb-6 max-w-sm text-sm">
              Keep a simple record of key people and touchpoints to support long-term career
              visibility.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Your First Contact
            </Button>
          </CardContent>
        </Card>
      ) : filteredContacts.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center italic">
          No contacts match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map(contact => {
            const age = getAgeFromBirthday(contact.birthday);
            return (
              <Card
                key={contact.id}
                className="hover:border-primary/30 cursor-pointer transition-colors hover:shadow-md"
                onClick={() => router.push(`/network/${contact.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{contact.fullName}</CardTitle>
                      {contact.relationship && (
                        <p className="text-muted-foreground mt-1 text-sm">{contact.relationship}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      {contact._count.interactions}{' '}
                      {contact._count.interactions === 1 ? 'interaction' : 'interactions'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2 text-sm">
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
