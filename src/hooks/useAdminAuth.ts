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
 * Более надежное решение, не полагающееся только на localStorage
 */
export function useAdminAuth(): AdminAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Функция проверки статуса администратора
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAdmin(false);
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        setUser(session.user);
        
        // Проверяем права администратора в профиле
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
        setIsAdmin(profileData?.is_admin || false);
        
      } catch (error) {
        console.error('Ошибка в хуке useAdminAuth:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
    
    // Подписка на изменение аутентификации
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      }
    });
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
  
  return { user, isAdmin, isLoading };
}
