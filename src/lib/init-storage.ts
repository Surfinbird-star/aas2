import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

// Параметры для сервисного (админского) клиента Supabase
const supabaseUrl = 'https://oziouoqfatpnmcfhvuur.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96aW91b3FmYXRwbm1jZmh2dXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTk1MDIwOCwiZXhwIjoyMDU3NTI2MjA4fQ.KiLOzVRLz_dbZQwCBCrZPpmD6Jqvil6EBevbmP2MVLs';

// Создаем админский клиент с сервисным ключом для управления бакетами
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Инициализация хранилища Supabase Storage
 * Создает необходимые бакеты, если они не существуют
 */
export const initStorage = async () => {
  try {
    console.log('Начинаем инициализацию хранилища');
    
    // Проверяем наличие бакета user_documents через админский клиент
    const { data: buckets, error: listError } = await adminSupabase.storage.listBuckets();
    
    if (listError) {
      console.error('Ошибка при проверке бакетов:', listError);
      return;
    }
    
    console.log('Список бакетов:', buckets?.map(b => b.name).join(', '));
    
    // Проверяем, существует ли уже бакет user_documents
    const userDocsBucketExists = buckets?.some(bucket => bucket.name === 'user_documents');
    
    if (!userDocsBucketExists) {
      console.log('Создаем бакет user_documents через админский доступ...');
      
      // Создаем новый бакет для документов пользователей используя админский клиент
      const { error: createError } = await adminSupabase.storage.createBucket('user_documents', {
        public: true, // Делаем бакет публичным
        fileSizeLimit: 10 * 1024 * 1024, // 10MB лимит на файл
      });
      
      if (createError) {
        console.error('Ошибка при создании бакета user_documents:', createError);
      } else {
        console.log('Бакет user_documents успешно создан');
        
        // Создаем политику доступа "Allow All"
        try {
          // Выполняем SQL запрос напрямую в базу данных
          const { error: sqlError } = await adminSupabase.rpc('execute_sql', {
            query: `
              -- Создаем политику для чтения и записи для всех пользователей
              CREATE POLICY "Allow All" ON storage.objects FOR ALL TO authenticated, anon
              USING (bucket_id = 'user_documents') WITH CHECK (bucket_id = 'user_documents');
            `
          });
          
          if (sqlError) {
            console.error('Ошибка при создании политики доступа:', sqlError);
          } else {
            console.log('Политика доступа "Allow All" успешно создана');
          }
        } catch (err) {
          console.error('Ошибка при выполнении SQL:', err);
        }
      }
    } else {
      console.log('Бакет user_documents уже существует');
      
      try {
        // Обновляем бакет, делаем его публичным
        const { error: updateError } = await adminSupabase.storage.updateBucket('user_documents', {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024
        });
        
        if (updateError) {
          console.error('Ошибка при обновлении бакета:', updateError);
        } else {
          console.log('Бакет обновлен до публичного');
        }
      } catch (err) {
        console.error('Ошибка при обновлении бакета:', err);
      }
    }
  } catch (error) {
    console.error('Ошибка при инициализации хранилища:', error);
  }
};
