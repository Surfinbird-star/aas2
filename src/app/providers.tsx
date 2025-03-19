'use client'

import { ReactNode, useEffect } from 'react'
import { initStorage } from '@/lib/init-storage'

// Провайдер для будущих глобальных контекстов
export function Providers({ children }: { children: ReactNode }) {
  // Инициализируем хранилище при загрузке приложения
  useEffect(() => {
    // Создаем бакет для файлов, если его нет
    initStorage()
      .then(() => console.log('Хранилище инициализировано'))
      .catch(err => console.error('Ошибка инициализации хранилища:', err))
  }, [])

  return (
    <>
      {children}
    </>
  )
}
