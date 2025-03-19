import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Используем сервисный ключ для обхода RLS
const supabaseUrl = 'https://oziouoqfatpnmcfhvuur.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96aW91b3FmYXRwbm1jZmh2dXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTk1MDIwOCwiZXhwIjoyMDU3NTI2MjA4fQ.KiLOzVRLz_dbZQwCBCrZPpmD6Jqvil6EBevbmP2MVLs';
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Получаем данные из запроса
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return NextResponse.json({ error: 'Отсутствует файл или ID пользователя' }, { status: 400 });
    }
    
    // Создаем уникальный путь для файла
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageFileName = `${Date.now()}_${safeFileName}`;
    const filePath = `${userId}/${storageFileName}`;
    
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
      return NextResponse.json({ error: `Ошибка загрузки: ${error.message}` }, { status: 500 });
    }
    
    // Создаем запись в таблице user_documents через админский доступ
    const { data: documentData, error: documentError } = await adminSupabase
      .from('user_documents')
      .insert({
        user_id: userId,
        document_name: file.name,
        document_type: file.type,
        storage_path: filePath,
        size_bytes: file.size,
        uploaded_at: new Date().toISOString()
      })
      .select();
    
    if (documentError) {
      console.error('Ошибка при сохранении информации о документе:', documentError);
      
      // Если не удалось создать запись, удаляем загруженный файл
      await adminSupabase.storage.from('user_documents').remove([filePath]);
      
      return NextResponse.json({ error: `Ошибка сохранения: ${documentError.message}` }, { status: 500 });
    }
    
    // Возвращаем успешный результат с данными о документе
    return NextResponse.json({
      success: true,
      message: 'Файл успешно загружен',
      document: documentData[0]
    });
    
  } catch (error: any) {
    console.error('Неожиданная ошибка при загрузке файла:', error);
    return NextResponse.json(
      { error: `Произошла ошибка: ${error.message || 'Неизвестная ошибка'}` },
      { status: 500 }
    );
  }
}
