'use client'
// src/components/providers/index.tsx
// Combined providers wrapper for root layout

import { type ReactNode } from 'react'
import { QueryProvider } from './QueryProvider'
import { SessionRefresh } from './SessionRefresh'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SessionRefresh />
      {children}
    </QueryProvider>
  )
}

export { QueryProvider } from './QueryProvider'
export { SessionRefresh } from './SessionRefresh'
