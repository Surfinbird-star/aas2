'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Проверяем аутентификацию и права администратора
    const checkAdminRights = async () => {
      try {
        console.log('Проверка прав администратора...')
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Сессия:', session ? 'Активна' : 'Отсутствует')
        
        if (!session) {
          // Пользователь не аутентифицирован
          console.log('Перенаправление на страницу логина (нет сессии)')
          router.push('/admin/login')
          return
        }
        
        // Проверяем, есть ли у пользователя права администратора
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()
        
        console.log('Данные профиля:', profileData)
        
        if (error) {
          console.error('Ошибка при получении профиля:', error)
          router.push('/admin/login?error=profile_error')
          return
        }
        
        // Строгая проверка прав администратора
        // Доступ разрешен только пользователям с полем is_admin = true
        const skipAdminCheck = false
        
        const isAdmin = profileData && typeof profileData.is_admin !== 'undefined'
          ? Boolean(profileData.is_admin)
          : skipAdminCheck // Если is_admin не определено, используем skipAdminCheck
        
        console.log('Права администратора:', isAdmin ? 'Да' : 'Нет')
        
        if (!isAdmin) {
          console.log('Перенаправление на страницу логина (нет прав админа)')
          router.push('/admin/login?error=not_admin')
          return
        }
        
        // Пользователь аутентифицирован и имеет права администратора
        setIsAdmin(true)
        setLoading(false)
        
        // При необходимости, обновляем поле is_admin
        if (profileData && typeof profileData.is_admin === 'undefined') {
          console.log('Обновление профиля: устанавливаем is_admin = true')
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ is_admin: true })
            .eq('id', session.user.id)
          
          if (updateError) {
            console.error('Ошибка при обновлении профиля:', updateError)
          } else {
            console.log('Профиль успешно обновлен')
          }
        }
      } catch (error) {
        console.error('Ошибка при проверке прав администратора:', error)
        console.log('Перенаправление на страницу логина (ошибка)')
        router.push('/admin/login')
      }
    }

    checkAdminRights()
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
      <header className="bg-blue-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">AAS Admin</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link 
                href="/admin/orders" 
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition duration-200"
              >
                Заказы
              </Link>
              <button 
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition duration-200"
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
