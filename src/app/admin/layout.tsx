'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import './admin.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Проверяем наличие сохраненной информации о правах администратора
    const adminCheckStorage = localStorage.getItem('admin_authenticated')
    const adminSessionTime = localStorage.getItem('admin_session_time')
    
    // Если есть сохраненная информация о правах и она не старше 1 часа
    if (adminCheckStorage === 'true' && adminSessionTime) {
      const sessionTime = parseInt(adminSessionTime)
      const currentTime = Date.now()
      
      // Проверяем, что сессия не старше 1 часа (3600000 мс)
      if (currentTime - sessionTime < 3600000) {
        console.log('Используем кэшированные права администратора')
        setIsAdmin(true)
        setLoading(false)
        return
      }
    }

    // Если кэша нет или он устарел, выполняем проверку заново
    const checkAdminRights = async () => {
      try {
        // Устанавливаем таймаут для избежания бесконечного зависания
        const timeoutId = setTimeout(() => {
          console.log('Таймаут проверки прав администратора')
          setLoading(false)
          router.push('/admin/login?error=timeout')
        }, 5000) // 5 секунд на проверку
        
        // 1. Проверяем сессию
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          clearTimeout(timeoutId)
          setLoading(false)
          router.push('/admin/login')
          return
        }
        
        // 2. Проверяем права администратора
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()
        
        clearTimeout(timeoutId)
        
        // Если пользователь админ, сохраняем это в state и localStorage
        if (profileData && profileData.is_admin) {
          setIsAdmin(true)
          // Кэшируем права администратора
          localStorage.setItem('admin_authenticated', 'true')
          localStorage.setItem('admin_session_time', Date.now().toString())
        } else {
          console.log('Пользователь не является администратором')
          router.push('/admin/login?error=not_admin')
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Ошибка при проверке прав администратора:', error)
        setLoading(false)
        router.push('/admin/login?error=unknown')
      }
    }

    checkAdminRights()
    
    // Устанавливаем таймаут на случай, если даже try-catch не сработает
    const fallbackTimeoutId = setTimeout(() => {
      if (loading) {
        console.log('Финальный таймаут проверки прав')
        setLoading(false)
        router.push('/admin/login')
      }
    }, 8000) // Финальный таймаут через 8 секунд
    
    return () => clearTimeout(fallbackTimeoutId)
  }, [router])

  // Функция для выхода из аккаунта
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/admin/login')
    } catch (error) {
      console.error('Ошибка при выходе из аккаунта:', error)
    }
  }

  // Скрываем индикатор загрузки, чтобы избежать бесконечной загрузки

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Верхняя навигационная панель администратора */}
      <header className="bg-gray-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">AAS Admin</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link 
                href="/admin/orders" 
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition duration-200"
              >
                Заказы
              </Link>
              <Link 
                href="/admin/users" 
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition duration-200"
              >
                Пользователи
              </Link>
              <button 
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition duration-200"
              >
                Выйти
              </button>
            </nav>
          </div>
        </div>
      </header>
      
      {/* Основной контент */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>
      
      {/* Футер */}
      <footer className="bg-gray-200 py-4 border-t border-gray-300">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} AAS Food Admin Panel</p>
        </div>
      </footer>
    </div>
  )
}
