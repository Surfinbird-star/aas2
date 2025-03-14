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
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert([profileData])
      .select();
    
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
