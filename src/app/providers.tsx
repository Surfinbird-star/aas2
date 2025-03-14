'use client'

import { ReactNode } from 'react'

// Провайдер для будущих глобальных контекстов
export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
    </>
  )
}
