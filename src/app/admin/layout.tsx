'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import './admin.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAdmin, isLoading } = useAdminAuth()
  
  useEffect(() => {
    // Перенаправляем на страницу входа, если нет пользователя или не админ
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/admin/login' + (!user ? '' : '?error=not_admin'));
    }
  }, [user, isAdmin, isLoading, router])

  // Функция для выхода из аккаунта
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/admin/login')
    } catch (error) {
      console.error('Ошибка при выходе из аккаунта:', error)
    }
  }

  // Если идет проверка авторизации, показываем загрузку
  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <div className="text-gray-500">Проверка доступа...</div>
      </div>
    );
  }
  
  // Если нет пользователя или он не админ, не показываем содержимое
  if (!user || !isAdmin) {
    return null;
  }

  // Если пользователь админ, показываем интерфейс администратора
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
      <footer className="mt-auto py-3 bg-gray-800 text-white text-center text-sm">
        &copy; {new Date().getFullYear()} AAS Food Admin Panel
      </footer>
    </div>
  )
}
