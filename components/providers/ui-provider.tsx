'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface UIContextType {
  uiV2: boolean
  setUiV2: (enabled: boolean) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: React.ReactNode }) {
  // Defaulting to true for our cleanup implementation pass
  const [uiV2, setUiV2] = useState(true)

  return (
    <UIContext.Provider value={{ uiV2, setUiV2 }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
