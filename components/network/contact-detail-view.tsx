"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { deleteContact } from "@/app/actions/network";
import { toast } from "sonner";
import { ContactProfileCard } from "./contact-profile-card";
import { InteractionTimeline } from "./interaction-timeline";
import { ContactDialog } from "./contact-dialog";
import { OutreachDraftPanel } from "./outreach-draft-panel";

interface Interaction {
  id: string;
  contactId: string;
  occurredAt: Date;
  channel: string;
  summary: string;
  nextStep?: string | null;
  followUpDate?: Date | null;
  rawNotes?: string | null;
  createdAt: Date;
}

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
}

export function ContactDetailView({
  contact,
  interactions,
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
        toast.success("Contact deleted");
        router.push("/network");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Delete contact error:", error);
      toast.error("Failed to delete contact");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{contact.fullName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Are you sure?
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
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
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Two-column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Profile */}
        <div className="lg:col-span-1">
          <ContactProfileCard contact={contact} />
        </div>

        {/* Right Column: Interactions */}
        <div className="lg:col-span-2 space-y-6">
          <InteractionTimeline
            interactions={interactions}
            contactId={contact.id}
            onInteractionAdded={() => router.refresh()}
          />

          <OutreachDraftPanel contact={contact} interactions={interactions} />
        </div>
      </div>

      {/* Edit Dialog */}
      <ContactDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        contact={contact}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
