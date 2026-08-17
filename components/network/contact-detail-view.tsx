/**
 * Contact profile surface.
 *
 * Why: The profile owns contact actions and static profile data. Conversation
 * state and the interaction form live in contact-interactions.tsx so editing
 * a conversation does not make this page-sized component responsible for it.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Edit,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactDialog } from '@/components/network/contact-dialog';
import { InteractionTimeline, type Interaction } from '@/components/network/contact-interactions';
import { OutreachDraftHistory } from '@/components/network/outreach-draft-history';
import { OutreachWizard } from '@/app/network/[contactId]/outreach-wizard';
import type { ConnectedMcpProvider } from '@/components/reports/mcp-draft-actions';
import { deleteContact } from '@/app/actions/network';
import { getAgeFromBirthday, formatDate } from '@/lib/network';
import { toast } from 'sonner';

interface Contact {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  birthday?: Date | null;
  relationship?: string | null;
  personalityTraits?: string | null;
  notes?: string | null;
  createdAt: Date;
  interactions: Interaction[];
}

interface ContactDetailViewProps {
  contact: Contact;
  interactions: Interaction[];
  connectedMcpProviders: ConnectedMcpProvider[];
  initialDrafts: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: Date;
  }>;
  timeZone: string;
  today: string;
}

export function ContactDetailView({
  contact,
  interactions,
  connectedMcpProviders,
  initialDrafts,
  timeZone,
  today,
}: ContactDetailViewProps) {
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteContact(contact.id);
      if (result.success) {
        toast.success('Contact deleted.');
        router.push('/network');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Delete contact error:', error);
      toast.error('Could not delete the contact.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{contact.fullName}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-1 h-4 w-4" />
            Edit
          </Button>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Delete this contact?</span>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete contact'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ContactProfileCard contact={contact} />
        <div className="lg:col-span-2">
          <Tabs defaultValue="interactions">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="interactions" className="flex-1">
                <MessageSquare className="mr-2 h-4 w-4" />
                Conversations
              </TabsTrigger>
              <TabsTrigger value="outreach" className="flex-1">
                <Sparkles className="mr-2 h-4 w-4" />
                Message drafts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="interactions">
              <InteractionTimeline
                interactions={interactions}
                contactId={contact.id}
                timeZone={timeZone}
                today={today}
                onInteractionAdded={() => router.refresh()}
              />
            </TabsContent>
            <TabsContent value="outreach" className="space-y-6">
              <OutreachWizard contact={contact} connectedMcpProviders={connectedMcpProviders} />
              <div className="space-y-3">
                <h3 className="text-muted-foreground px-1 text-sm font-semibold tracking-widest uppercase">
                  Saved drafts
                </h3>
                <OutreachDraftHistory
                  key={initialDrafts.map(draft => `${draft.id}:${draft.content}`).join('|')}
                  initialDrafts={initialDrafts}
                  connectedMcpProviders={connectedMcpProviders}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ContactDialog
        key={`${contact.id}-${showEditDialog}`}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        contact={contact}
        onSuccess={() => {
          setShowEditDialog(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function ContactProfileCard({ contact }: { contact: Contact }) {
  const age = getAgeFromBirthday(contact.birthday);

  return (
    <div className="lg:col-span-1">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{contact.fullName}</CardTitle>
          {contact.relationship && (
            <Badge variant="secondary" className="w-fit">
              {contact.relationship}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="text-muted-foreground h-4 w-4 shrink-0" />
            {contact.birthday ? (
              <span>
                {formatDate(contact.birthday)}
                {age !== undefined && <span className="text-muted-foreground"> (age {age})</span>}
              </span>
            ) : (
              <span className="text-muted-foreground italic">Add a birthday</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="text-muted-foreground h-4 w-4 shrink-0" />
            {contact.email ? (
              <a href={`mailto:${contact.email}`} className="text-primary truncate hover:underline">
                {contact.email}
              </a>
            ) : (
              <span className="text-muted-foreground italic">Add an email</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
            {contact.phone ? (
              <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                {contact.phone}
              </a>
            ) : (
              <span className="text-muted-foreground italic">Add a phone number</span>
            )}
          </div>
          {contact.personalityTraits && (
            <>
              <Separator />
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Users className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">How they talk</span>
                </div>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {contact.personalityTraits}
                </p>
              </div>
            </>
          )}
          {contact.notes && (
            <>
              <Separator />
              <div>
                <span className="mb-2 block text-sm font-medium">Notes</span>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">{contact.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
