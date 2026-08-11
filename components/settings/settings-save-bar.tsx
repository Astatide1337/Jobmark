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
    <div className="animate-in fade-in slide-in-from-top-2 sticky top-0 z-20 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 backdrop-blur-md duration-300">
      <div className="flex items-center gap-2 text-amber-500">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="rounded-lg border-0 bg-amber-500 px-4 text-white hover:bg-amber-600"
      >
        {isSaving ? 'Saving...' : 'Save Now'}
      </Button>
    </div>
  );
}
