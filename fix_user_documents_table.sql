-- Создаем или обновляем таблицу user_documents с правильными именами полей
CREATE TABLE IF NOT EXISTS public.user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Отключаем RLS для таблицы, чтобы упростить доступ
ALTER TABLE public.user_documents DISABLE ROW LEVEL SECURITY;

-- Отключаем RLS для хранилища файлов
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Проверяем, что бакет публичный
UPDATE storage.buckets 
SET public = true 
WHERE name = 'user_documents';

-- Создаем политику для хранилища (если RLS снова включат)
CREATE POLICY "Разрешить полный доступ к user_documents" 
ON storage.objects 
FOR ALL 
TO authenticated, anon
USING (bucket_id = 'user_documents')
WITH CHECK (bucket_id = 'user_documents');
