"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { createContact, updateContact } from "@/app/actions/network";
import { parseUTCDate } from "@/lib/network";
import { toast } from "sonner";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: {
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    birthday?: Date | null;
    relationship?: string | null;
    personalityTraits?: string | null;
    notes?: string | null;
  };
  onSuccess?: () => void;
}

export function ContactDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: ContactDialogProps) {
  const isEditing = !!contact;
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [relationship, setRelationship] = useState("");
  const [personalityTraits, setPersonalityTraits] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFullName(contact?.fullName ?? "");
      setEmail(contact?.email ?? "");
      setPhone(contact?.phone ?? "");
      setBirthday(
        contact?.birthday
          ? new Date(contact.birthday).toISOString().split("T")[0]
          : ""
      );
      setRelationship(contact?.relationship ?? "");
      setPersonalityTraits(contact?.personalityTraits ?? "");
      setNotes(contact?.notes ?? "");
      setErrors({});
    }
  }, [open, contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      if (isEditing && contact) {
        const result = await updateContact(contact.id, {
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          birthday: birthday ? parseUTCDate(birthday) : null,
          relationship: relationship || undefined,
          personalityTraits: personalityTraits || undefined,
          notes: notes || undefined,
        });

        if (result.success) {
          toast.success("Contact updated");
          onSuccess?.();
          onOpenChange(false);
        } else {
          toast.error(result.message);
        }
      } else {
        const formData = new FormData();
        formData.append("fullName", fullName);
        formData.append("email", email);
        formData.append("phone", phone);
        formData.append("birthday", birthday);
        formData.append("relationship", relationship);
        formData.append("personalityTraits", personalityTraits);
        formData.append("notes", notes);

        const result = await createContact(
          { success: false, message: "" },
          formData
        );

        if (result.success) {
          toast.success("Contact added");
          onSuccess?.();
          onOpenChange(false);
        } else if (result.errors) {
          const mapped: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(result.errors)) {
            if (msgs && msgs.length > 0) {
              mapped[key] = msgs[0];
            }
          }
          setErrors(mapped);
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error("Contact dialog error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your contact's information."
              : "Add someone to your professional network."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Full Name (required) */}
          <div className="space-y-2">
            <Label htmlFor="contact-fullName">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Smith"
              maxLength={150}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input
              id="contact-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>

          {/* Birthday */}
          <div className="space-y-2">
            <Label htmlFor="contact-birthday">Birthday</Label>
            <Input
              id="contact-birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
            {errors.birthday && (
              <p className="text-xs text-destructive">{errors.birthday}</p>
            )}
          </div>

          {/* Relationship */}
          <div className="space-y-2">
            <Label htmlFor="contact-relationship">Relationship</Label>
            <Input
              id="contact-relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Former Manager, Mentor, Colleague"
            />
            {errors.relationship && (
              <p className="text-xs text-destructive">{errors.relationship}</p>
            )}
          </div>

          {/* Personality Traits */}
          <div className="space-y-2">
            <Label htmlFor="contact-personalityTraits">
              Personality Traits
            </Label>
            <Textarea
              id="contact-personalityTraits"
              value={personalityTraits}
              onChange={(e) => setPersonalityTraits(e.target.value)}
              placeholder="Key personality traits or communication style..."
              className="resize-none h-16"
            />
            {errors.personalityTraits && (
              <p className="text-xs text-destructive">
                {errors.personalityTraits}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="contact-notes">Notes</Label>
            <Textarea
              id="contact-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else to remember about this person..."
              className="resize-none h-20"
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
