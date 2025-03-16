import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Этот API-маршрут будет использоваться для создания профиля пользователя в обход RLS
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { 
      id, 
      first_name, 
      last_name, 
      name, 
      email, 
      phone, 
      address 
    } = requestData;
    
    console.log('API: Получен запрос на создание профиля:', id);
    
    // Проверяем наличие обязательных полей
    if (!id || !first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля' },
        { status: 400 }
      );
    }
    
    // Создаем структуру данных профиля
    const profileData = {
      id,
      first_name,
      last_name,
      name,
      email,
      phone,
      address: address || null,
      created_at: new Date().toISOString(),
    };
    
    console.log('API: Создание профиля с данными:', profileData);
    
    // Используем административный доступ для обхода RLS
    const supabaseAdmin = getSupabaseAdmin();
    
    // Сначала проверяем, существует ли профиль с таким ID
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = запись не найдена
      console.error('API: Ошибка при проверке профиля:', checkError.message);
      return NextResponse.json(
        { error: checkError.message },
        { status: 500 }
      );
    }
    
    let data, error;
    
    if (existingProfile) {
      // Если профиль существует, обновляем его
      console.log('API: Обновление существующего профиля');
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name,
          last_name,
          name,
          email,
          phone,
          address: address || null
        })
        .eq('id', id)
        .select();
        
      data = updateData;
      error = updateError;
    } else {
      // Если профиля нет, создаем новый
      console.log('API: Создание нового профиля');
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert([profileData])
        .select();
        
      data = insertData;
      error = insertError;
    }
    
    if (error) {
      console.error('API: Ошибка при создании профиля:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    console.log('API: Профиль успешно создан:', data);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API: Неизвестная ошибка:', error.message);
    return NextResponse.json(
      { error: error.message || 'Неизвестная ошибка' },
      { status: 500 }
    );
  }
}
