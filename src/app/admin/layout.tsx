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
    // Предотвращаем выполнение на сервере
    if (typeof window === 'undefined') return;

    const checkAuth = async () => {
      try {
        // Проверяем флаг перенаправления, чтобы избежать зацикливания
        const redirectFlag = sessionStorage.getItem('admin_redirect');
        if (redirectFlag === 'true') {
          // Удаляем флаг перенаправления и прекращаем проверку
          sessionStorage.removeItem('admin_redirect');
          setLoading(false);
          return;
        }
        
        // Проверяем, сохранена ли информация о том, что пользователь - админ
        const isAdminAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
        if (isAdminAuthenticated) {
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }
        
        // Если нет информации в sessionStorage, проверяем сессию Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Нет активной сессии, перенаправляем на страницу входа
          setLoading(false);
          setTimeout(() => {
            sessionStorage.setItem('admin_redirect', 'true');
            window.location.replace('/admin/login');
          }, 100);
          return;
        }
        
        // Проверяем права администратора
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
        
        if (data && data.is_admin === true) {
          // Пользователь - администратор
          sessionStorage.setItem('admin_authenticated', 'true');
          setIsAuthenticated(true);
          setLoading(false);
        } else {
          // Пользователь не администратор, перенаправляем
          setLoading(false);
          setTimeout(() => {
            sessionStorage.setItem('admin_redirect', 'true');
            window.location.replace('/admin/login?error=not_admin');
          }, 100);
        }
      } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        setLoading(false);
        setTimeout(() => {
          sessionStorage.setItem('admin_redirect', 'true');
          window.location.replace('/admin/login');
        }, 100);
      }
    };
    
    // Запускаем проверку
    checkAuth();
  }, []);

  // Функция выхода из аккаунта
  const handleLogout = async () => {
    try {
      // Сначала устанавливаем флаг перенаправления
      sessionStorage.setItem('admin_redirect', 'true');
      
      // Очищаем состояние аутентификации
      sessionStorage.removeItem('admin_authenticated');
      setIsAuthenticated(false);
      
      // Выходим из Supabase и перенаправляем
      await supabase.auth.signOut();
      window.location.replace('/admin/login');
    } catch (error) {
      console.error('Ошибка при выходе из аккаунта:', error);
      // Даже при ошибке пытаемся перенаправить
      sessionStorage.setItem('admin_redirect', 'true');
      sessionStorage.removeItem('admin_authenticated');
      window.location.replace('/admin/login');
    }
  };

  // Показываем загрузку
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }
  
  // Если не авторизован, показываем сообщение о перенаправлении
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100">
        <div className="text-gray-500">Перенаправление на страницу входа...</div>
      </div>
    );
  }

  // Если пользователь админ, показываем интерфейс
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
  );
}
