"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, Users } from "lucide-react";
import { getAgeFromBirthday, formatDate } from "@/lib/network";

interface ContactProfileCardProps {
  contact: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    birthday?: Date | null;
    relationship?: string | null;
    personalityTraits?: string | null;
    notes?: string | null;
  };
}

export function ContactProfileCard({ contact }: ContactProfileCardProps) {
  const age = getAgeFromBirthday(contact.birthday);

  return (
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
        {/* Birthday / Age */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          {contact.birthday ? (
            <span>
              {formatDate(contact.birthday)}
              {age !== undefined && (
                <span className="text-muted-foreground"> (age {age})</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground italic">
              Add birthday
            </span>
          )}
        </div>

        {/* Email */}
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              className="text-primary hover:underline truncate"
            >
              {contact.email}
            </a>
          ) : (
            <span className="text-muted-foreground italic">No email</span>
          )}
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
          {contact.phone ? (
            <a
              href={`tel:${contact.phone}`}
              className="text-primary hover:underline"
            >
              {contact.phone}
            </a>
          ) : (
            <span className="text-muted-foreground italic">No phone</span>
          )}
        </div>

        {/* Personality Traits */}
        {contact.personalityTraits && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Personality</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {contact.personalityTraits}
              </p>
            </div>
          </>
        )}

        {/* Notes */}
        {contact.notes && (
          <>
            <Separator />
            <div>
              <span className="text-sm font-medium block mb-2">Notes</span>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {contact.notes}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
