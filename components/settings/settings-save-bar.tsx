'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SettingsSaveBarProps {
  show: boolean
  onSave: () => void
  isSaving: boolean
  message?: string
}

export function SettingsSaveBar({
  show,
  onSave,
  isSaving,
  message = 'You have unsaved changes'
}: SettingsSaveBarProps) {
  if (!show) return null

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 text-amber-500">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <Button 
        size="sm" 
        onClick={onSave} 
        disabled={isSaving}
        className="rounded-lg px-4 bg-amber-500 text-white hover:bg-amber-600 border-0"
      >
        {isSaving ? 'Saving...' : 'Save Now'}
      </Button>
    </div>
  )
}
