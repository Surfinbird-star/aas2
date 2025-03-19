import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    // Получаем ID документа из параметров запроса
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('id');

    if (!documentId) {
      return new NextResponse('ID документа не указан', { status: 400 });
    }

    console.log(`Запрос на скачивание документа с ID: ${documentId}`);

    // Получаем информацию о документе из базы данных
    const { data, error } = await supabase
      .from('user_documents')
      .select('content, filename, mime_type')
      .eq('id', documentId)
      .single();

    if (error) {
      console.error('Ошибка при получении информации о документе:', error);
      return new NextResponse('Ошибка при получении информации о документе', { status: 500 });
    }

    if (!data || !data.content) {
      return new NextResponse('Документ не найден или не содержит данных', { status: 404 });
    }

    let fileData: Buffer;
    
    try {
      // Пробуем декодировать как обычный base64
      fileData = Buffer.from(data.content, 'base64');
    } catch (decodeError) {
      console.error('Ошибка при декодировании base64:', decodeError);
      
      // Альтернативный вариант - возможно, строка содержит URL
      if (data.content.startsWith('http')) {
        try {
          // Перенаправляем на прямую ссылку
          return NextResponse.redirect(data.content);
        } catch (redirectError) {
          console.error('Не удалось перенаправить на URL:', redirectError);
          return new NextResponse('Не удалось обработать документ', { status: 500 });
        }
      }

      return new NextResponse('Не удалось декодировать содержимое документа', { status: 500 });
    }

    // Создаем правильные заголовки для скачивания файла
    const headers = new Headers();
    headers.set('Content-Type', data.mime_type || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(data.filename)}"`);
    headers.set('Content-Length', fileData.length.toString());

    // Возвращаем файл как ответ
    return new NextResponse(fileData, {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    return new NextResponse('Внутренняя ошибка сервера', { status: 500 });
  }
}
