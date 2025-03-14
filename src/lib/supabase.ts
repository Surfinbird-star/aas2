import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oziouoqfatpnmcfhvuur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96aW91b3FmYXRwbm1jZmh2dXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5NTAyMDgsImV4cCI6MjA1NzUyNjIwOH0.Ur-K3lL2WE-6GN981vwqQIL7uqLmnnlxa03Kw_i_fx8';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96aW91b3FmYXRwbm1jZmh2dXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTk1MDIwOCwiZXhwIjoyMDU3NTI2MjA4fQ.KiLOzVRLz_dbZQwCBCrZPpmD6Jqvil6EBevbmP2MVLs';

// Проверка окружения - браузер или сервер
const isBrowser = typeof window !== 'undefined';

// Единый клиент для использования на клиентской стороне
// Создаем его только один раз для всего приложения
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isBrowser, // Сохраняем сессию только в браузере
    storageKey: 'foodapp-auth', // Уникальный ключ хранения
  },
});

// Клиент для серверных операций - используется только на сервере
// Этот клиент не будет импортирован в браузере благодаря использованию в серверных компонентах
// Мы не экспортируем его напрямую, а создаем функцию для его получения
export const getSupabaseAdmin = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false, // Не сохраняем сессию для серверного клиента
      autoRefreshToken: false,
    },
  });
};

// Типы данных для Supabase
export type Tables = {
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
    created_at: string;
  };
  products: {
    id: number;
    name: string;
    description?: string;
    category_id: number;
    unit: string;
    image_url?: string;
    created_at: string;
  };
  categories: {
    id: number;
    name: string;
    created_at: string;
  };
  orders: {
    id: number;
    user_id: string;
    status: 'processing' | 'confirmed' | 'cancelled' | 'completed';
    created_at: string;
    updated_at: string;
  };
  order_items: {
    id: number;
    order_id: number;
    product_id: number;
    quantity: number;
    created_at: string;
  };
};
