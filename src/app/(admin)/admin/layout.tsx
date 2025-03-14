'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Административный макет
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Проверяем, является ли пользователь администратором
    const checkAdminStatus = async () => {
      try {
        // Получаем сессию пользователя
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          // Пользователь не аутентифицирован, перенаправляем на страницу входа для администратора
          router.push('/admin/login')
          return
        }

        // Проверяем, является ли пользователь администратором
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()

        if (profileError) throw profileError

        if (!profileData || !profileData.is_admin) {
          // Пользователь не является администратором, перенаправляем на главную страницу
          router.push('/')
          return
        }

        // Пользователь является администратором
        setIsAdmin(true)
        setLoading(false)
      } catch (error) {
        console.error('Ошибка при проверке статуса администратора:', error)
        router.push('/admin/login')
      }
    }

    checkAdminStatus()
  }, [router])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/admin/login')
    } catch (error) {
      console.error('Ошибка при выходе из системы:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Загрузка...</h2>
          <div className="w-16 h-16 border-t-4 border-blue-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null // Не отображаем содержимое, так как идет перенаправление
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Боковое меню для админки */}
      <div className="w-64 bg-blue-800 text-white shadow-lg">
        <div className="p-4 border-b border-blue-700">
          <h1 className="text-2xl font-bold">AAS Admin</h1>
          <p className="text-sm text-blue-300">Панель управления</p>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <Link 
                href="/admin/dashboard" 
                className={`flex items-center p-2 rounded-md ${
                  pathname === '/admin/dashboard' ? 'bg-blue-700' : 'hover:bg-blue-700'
                }`}
              >
                <svg 
                  className="w-5 h-5 mr-3" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                  />
                </svg>
                Панель
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/orders" 
                className={`flex items-center p-2 rounded-md ${
                  pathname === '/admin/orders' ? 'bg-blue-700' : 'hover:bg-blue-700'
                }`}
              >
                <svg 
                  className="w-5 h-5 mr-3" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
                  />
                </svg>
                Заказы
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/products" 
                className={`flex items-center p-2 rounded-md ${
                  pathname === '/admin/products' ? 'bg-blue-700' : 'hover:bg-blue-700'
                }`}
              >
                <svg 
                  className="w-5 h-5 mr-3" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
                  />
                </svg>
                Товары
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/categories" 
                className={`flex items-center p-2 rounded-md ${
                  pathname === '/admin/categories' ? 'bg-blue-700' : 'hover:bg-blue-700'
                }`}
              >
                <svg 
                  className="w-5 h-5 mr-3" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" 
                  />
                </svg>
                Категории
              </Link>
            </li>
            <li>
              <Link 
                href="/admin/users" 
                className={`flex items-center p-2 rounded-md ${
                  pathname === '/admin/users' ? 'bg-blue-700' : 'hover:bg-blue-700'
                }`}
              >
                <svg 
                  className="w-5 h-5 mr-3" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
                  />
                </svg>
                Пользователи
              </Link>
            </li>
          </ul>
          
          <div className="pt-8">
            <button
              onClick={handleLogout}
              className="flex items-center p-2 w-full text-left rounded-md hover:bg-blue-700"
            >
              <svg 
                className="w-5 h-5 mr-3" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                />
              </svg>
              Выйти
            </button>
          </div>
        </nav>
      </div>

      {/* Основное содержимое админки */}
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm">
          <div className="px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {pathname === '/admin/dashboard' && 'Панель управления'}
              {pathname === '/admin/orders' && 'Управление заказами'}
              {pathname === '/admin/products' && 'Управление товарами'}
              {pathname === '/admin/categories' && 'Управление категориями'}
              {pathname === '/admin/users' && 'Управление пользователями'}
            </h2>
          </div>
        </header>
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
