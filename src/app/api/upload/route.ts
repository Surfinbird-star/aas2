import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Используем сервисный ключ для обхода RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oziouoqfatpnmcfhvuur.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96aW91b3FmYXRwbm1jZmh2dXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTk1MDIwOCwiZXhwIjoyMDU3NTI2MjA4fQ.KiLOzVRLz_dbZQwCBCrZPpmD6Jqvil6EBevbmP2MVLs';
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('Получен запрос на загрузку файла');
    
    // Получаем данные из запроса
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    console.log('Данные файла:', { name: file?.name, size: file?.size, type: file?.type, userId });
    
    if (!file || !userId) {
      console.error('Отсутствует файл или ID пользователя');
      return new Response(JSON.stringify({ error: 'Отсутствует файл или ID пользователя' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Создаем уникальный путь для файла
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageFileName = `${Date.now()}_${safeFileName}`;
    const filePath = `${userId}/${storageFileName}`;
    
    console.log('Путь для загрузки:', filePath);
    
    // Загружаем файл через админский доступ
    const { data, error } = await adminSupabase.storage
      .from('user_documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });
    
    if (error) {
      console.error('Ошибка при загрузке файла:', error);
      return new Response(JSON.stringify({ error: `Ошибка загрузки: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Файл успешно загружен:', data);
    
    // Создаем запись в таблице user_documents через админский доступ
    const { data: documentData, error: documentError } = await adminSupabase
      .from('user_documents')
      .insert({
        user_id: userId,
        filename: file.name,
        file_size: file.size,
        storage_path: filePath,
        mime_type: file.type
      })
      .select();
    
    if (documentError) {
      console.error('Ошибка при сохранении информации о документе:', documentError);
      
      // Если не удалось создать запись, удаляем загруженный файл
      await adminSupabase.storage.from('user_documents').remove([filePath]);
      
      return new Response(JSON.stringify({ error: `Ошибка сохранения: ${documentError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Информация о документе сохранена:', documentData);
    
    // Возвращаем успешный результат с данными о документе
    return new Response(JSON.stringify({
      success: true,
      message: 'Файл успешно загружен',
      document: documentData?.[0] || null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Неожиданная ошибка при загрузке файла:', error);
    return new Response(JSON.stringify({ error: `Произошла ошибка: ${error.message || 'Неизвестная ошибка'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
