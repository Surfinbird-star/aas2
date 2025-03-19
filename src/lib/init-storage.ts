import { supabase } from './supabase';

/**
 * Инициализация хранилища Supabase Storage
 * Создает необходимые бакеты, если они не существуют
 */
export const initStorage = async () => {
  try {
    // Проверяем наличие бакета user_documents
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Ошибка при проверке бакетов:', listError);
      return;
    }
    
    // Проверяем, существует ли уже бакет user_documents
    const userDocsBucketExists = buckets.some(bucket => bucket.name === 'user_documents');
    
    if (!userDocsBucketExists) {
      console.log('Создаем бакет user_documents...');
      
      // Создаем новый бакет для документов пользователей
      const { error: createError } = await supabase.storage.createBucket('user_documents', {
        public: false, // Документы не должны быть публично доступны
        fileSizeLimit: 10 * 1024 * 1024, // 10MB лимит на файл
      });
      
      if (createError) {
        console.error('Ошибка при создании бакета user_documents:', createError);
      } else {
        console.log('Бакет user_documents успешно создан');
      }
    } else {
      console.log('Бакет user_documents уже существует');
    }
  } catch (error) {
    console.error('Ошибка при инициализации хранилища:', error);
  }
};
