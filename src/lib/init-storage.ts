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
    // Проверяем наличие бакета user_documents через админский клиент
    const { data: buckets, error: listError } = await adminSupabase.storage.listBuckets();
    
    if (listError) {
      console.error('Ошибка при проверке бакетов:', listError);
      return;
    }
    
    // Проверяем, существует ли уже бакет user_documents
    const userDocsBucketExists = buckets?.some(bucket => bucket.name === 'user_documents');
    
    if (!userDocsBucketExists) {
      console.log('Создаем бакет user_documents через админский доступ...');
      
      // Создаем новый бакет для документов пользователей используя админский клиент
      const { error: createError } = await adminSupabase.storage.createBucket('user_documents', {
        public: false, // Документы не должны быть публично доступны
        fileSizeLimit: 10 * 1024 * 1024, // 10MB лимит на файл
      });
      
      if (createError) {
        console.error('Ошибка при создании бакета user_documents:', createError);
      } else {
        console.log('Бакет user_documents успешно создан');
        
        // Настраиваем разрешения для бакета
        // Делаем бакет публичным для доступа к документам
        const { error: updateError } = await adminSupabase.storage.updateBucket('user_documents', {
          public: true, // Делаем бакет публичным
          fileSizeLimit: 10 * 1024 * 1024,
        });
        
        if (updateError) {
          console.error('Ошибка при обновлении настроек бакета:', updateError);
        } else {
          console.log('Настройки бакета обновлены');
        }
      }
    } else {
      console.log('Бакет user_documents уже существует');
    }
  } catch (error) {
    console.error('Ошибка при инициализации хранилища:', error);
  }
};
