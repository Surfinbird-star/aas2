-- Включаем RLS для таблицы profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Политика для создания профиля (любой аутентифицированный пользователь может создать свой профиль)
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Политика для чтения профиля (пользователи могут читать только свой профиль)
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Политика для обновления профиля (пользователи могут обновлять только свой профиль)
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Политика для удаления профиля (пользователи могут удалять только свой профиль)
CREATE POLICY "Users can delete own profile" 
ON profiles FOR DELETE 
TO authenticated 
USING (auth.uid() = id);
