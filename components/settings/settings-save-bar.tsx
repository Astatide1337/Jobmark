'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SettingsSaveBar({
  show,
  onSave,
  isSaving,
  message = 'You have unsaved changes',
}: {
  show: boolean;
  onSave: () => void;
  isSaving: boolean;
  message?: string;
}) {
  if (!show) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-2 border-warning/30 bg-warning/10 sticky top-0 z-20 flex items-center justify-between gap-3 rounded-xl border p-3 backdrop-blur-md duration-300">
      <div className="text-warning flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="bg-warning text-background hover:bg-warning/90 rounded-lg border-0 px-4"
      >
        {isSaving ? 'Saving...' : 'Save changes'}
      </Button>
    </div>
  );
}
