import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
}

/**
 * Хук для проверки администраторских прав пользователя
 * Улучшенная версия с использованием sessionStorage для мгновенного состояния
 */
export function useAdminAuth(): AdminAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Установка статуса администратора с сохранением в sessionStorage
  const setAdminStatus = (status: boolean) => {
    setIsAdmin(status);
    if (typeof window !== 'undefined') {
      if (status) {
        sessionStorage.setItem('admin_authenticated', 'true');
      } else {
        sessionStorage.removeItem('admin_authenticated');
      }
    }
  };

  // Быстрая проверка наличия данных в sessionStorage
  const checkSessionStorage = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin_authenticated') === 'true';
    }
    return false;
  };

  // Функция для проверки админ статуса
  const checkAdminStatus = async () => {
    try {
      // Сначала проверяем sessionStorage для быстрого ответа
      const quickCheck = checkSessionStorage();
      if (quickCheck) {
        console.log('Найден статус админа в sessionStorage');
        setIsAdmin(true);
        
        // Все равно проверяем сессию, но откладываем изменение isLoading
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('Сессия не найдена, сбрасываем права админа');
          setAdminStatus(false);
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        setUser(session.user);
        
        // Проверяем права в профиле, не блокируя интерфейс
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error('Ошибка при проверке прав администратора:', error);
          setAdminStatus(false);
        } else {
          // Установить актуальные права
          const hasAdminRights = profileData?.is_admin || false;
          setAdminStatus(hasAdminRights);
        }
        
        setIsLoading(false);
        return;
      }
      
      // Если в sessionStorage нет данных, делаем полную проверку
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setAdminStatus(false);
        setIsLoading(false);
        return;
      }
      
      setUser(session.user);
      
      // Проверяем наличие админ прав в профиле
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      
      if (error) {
        console.error('Ошибка при проверке прав администратора:', error);
        setAdminStatus(false);
        setIsLoading(false);
        return;
      }
      
      // Устанавливаем статус администратора
      const hasAdminRights = profileData?.is_admin || false;
      setAdminStatus(hasAdminRights);
      
      // Синхронизируем статус между вкладками через localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_session_check', new Date().toISOString());
      }
      
    } catch (error) {
      console.error('Ошибка в хуке useAdminAuth:', error);
      setAdminStatus(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Проверяем sessionStorage и устанавливаем начальное состояние
    if (checkSessionStorage()) {
      setIsAdmin(true);
      // Уменьшаем время загрузки для страниц, если есть данные в sessionStorage
      setIsLoading(false);
    }
    
    // Первоначальная проверка
    checkAdminStatus();
    
    // Подписка на изменение аутентификации в Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
        
        setAdminStatus(profileData?.is_admin || false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAdminStatus(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_session_check');
          sessionStorage.removeItem('admin_authenticated');
          // Принудительно перезагружаем страницу, чтобы избежать состояния "застрявшей" сессии
          window.location.href = '/admin/login';
        }
      }
    });
    
    // Синхронизация между вкладками
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin_session_check') {
        console.log('Admin session check triggered from another tab');
        checkAdminStatus();
      }
    };
    
    // Обработчик для синхронизации между вкладками
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }
    
    // Интервал проверки сессии каждые 30 секунд
    const interval = setInterval(() => {
      checkAdminStatus();
    }, 30000);
    
    return () => {
      // Очистка при размонтировании
      authListener?.subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
      clearInterval(interval);
    };
  }, []);
  
  return { user, isAdmin, isLoading };
}
