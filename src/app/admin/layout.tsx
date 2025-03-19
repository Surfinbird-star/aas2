'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import './admin.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Обработчик для хранения информации о перенаправлении
    const redirectFlag = sessionStorage.getItem('admin_redirect');
    if (redirectFlag) {
      // Удаляем флаг перенаправления, чтобы не зациклиться
      sessionStorage.removeItem('admin_redirect'); 
      setLoading(false);
      return;
    }

    // Проверяем, авторизован ли администратор (один раз при загрузке страницы)
    if (typeof window !== 'undefined') {
      const isAdminAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
      
      if (isAdminAuthenticated) {
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }
      
      // Если нет информации в sessionStorage, проверяем сессию Supabase
      const checkAdmin = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            // Устанавливаем флаг перенаправления
            sessionStorage.setItem('admin_redirect', 'true');
            window.location.href = '/admin/login';
            return;
          }
          
          // Проверяем права администратора
          const { data } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();
          
          if (data && data.is_admin) {
            // Сохраняем статус в sessionStorage
            sessionStorage.setItem('admin_authenticated', 'true');
            setIsAuthenticated(true);
            setLoading(false);
          } else {
            // Устанавливаем флаг перенаправления
            sessionStorage.setItem('admin_redirect', 'true');
            window.location.href = '/admin/login?error=not_admin';
          }
        } catch (error) {
          console.error('Ошибка при проверке сессии:', error);
          // Устанавливаем флаг перенаправления
          sessionStorage.setItem('admin_redirect', 'true');
          window.location.href = '/admin/login';
        }
      };
      
      checkAdmin();
    }
  }, [])

  // Функция для выхода из аккаунта
  const handleLogout = async () => {
    try {
      // Сначала устанавливаем флаг перенаправления, чтобы предотвратить зацикливание
      sessionStorage.setItem('admin_redirect', 'true');
      
      // Очищаем состояние аутентификации
      sessionStorage.removeItem('admin_authenticated');
      setIsAuthenticated(false);
      
      // Выходим из Supabase
      await supabase.auth.signOut();
      
      // Отключаем использование истории браузера и перенаправляем на страницу входа
      window.location.replace('/admin/login');
    } catch (error) {
      console.error('Ошибка при выходе из аккаунта:', error);
      // Даже в случае ошибки устанавливаем флаг перенаправления
      sessionStorage.setItem('admin_redirect', 'true');
      sessionStorage.removeItem('admin_authenticated');
      setIsAuthenticated(false);
      window.location.replace('/admin/login');
    }
  }

  // Показываем загрузку, пока не завершена проверка авторизации
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <div className="text-gray-500">Нет доступа. <a href="/admin/login" className="text-blue-500 underline">Войти</a></div>
      </div>
    );
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
