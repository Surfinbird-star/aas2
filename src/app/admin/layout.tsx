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
    // Максимально простая проверка администратора
    const checkAdmin = async () => {
      // Сначала проверяем localStorage
      try {
        // Сразу проверяем кэш, без проверки времени
        if (typeof window !== 'undefined' && localStorage.getItem('admin_authenticated') === 'true') {
          console.log('Администратор авторизован из localStorage');
          setIsAdmin(true);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.log('Ошибка при доступе к localStorage');
      }

      // Если нет в кэше, проверяем сессию
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setLoading(false);
          router.push('/admin/login');
          return;
        }
        
        // Проверяем права администратора
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
        
        if (data && data.is_admin) {
          setIsAdmin(true);
          // Сохраняем в localStorage для быстрого доступа в будущем
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('admin_authenticated', 'true');
            }
          } catch {}
        } else {
          router.push('/admin/login?error=not_admin');
        }
      } catch (error) {
        console.error('Ошибка при проверке сессии:', error);
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin()
  }, [router])

  // Функция для выхода из аккаунта
  const handleLogout = async () => {
    try {
      // Удаляем информацию об админе из localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_authenticated');
      }
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
