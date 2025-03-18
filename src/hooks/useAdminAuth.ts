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
 * Радикально переработанная версия с принудительным перенаправлением и кросс-вкладочной синхронизацией
 */
export function useAdminAuth(): AdminAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Функция для проверки админ статуса
  const checkAdminStatus = async () => {
    try {
      // Получаем текущую сессию
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setIsAdmin(false);
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
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }
      
      // Устанавливаем статус администратора
      const hasAdminRights = profileData?.is_admin || false;
      setIsAdmin(hasAdminRights);
      
      // Синхронизируем статус между вкладками через localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_session_check', new Date().toISOString());
      }
      
    } catch (error) {
      console.error('Ошибка в хуке useAdminAuth:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
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
        
        setIsAdmin(profileData?.is_admin || false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_session_check');
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
