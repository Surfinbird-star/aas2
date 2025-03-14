-- Включаем расширение UUID для генерации уникальных идентификаторов
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица с категориями продуктов
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица с продуктами
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id),
    unit TEXT NOT NULL, -- единица измерения (кг, литр, упаковка и т.д.)
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Создаем индексы для ускорения запросов
    CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Таблица с пользователями (расширяет встроенную таблицу auth.users в Supabase)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица с заказами
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    status TEXT NOT NULL CHECK (status IN ('processing', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Создаем индексы для ускорения запросов
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Таблица с элементами заказов
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Создаем индексы для ускорения запросов
    CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Создаем индексы для ускорения запросов, как указано в пользовательских правилах
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items(product_id);

-- Добавляем RLS (Row Level Security) политики для безопасности доступа к данным
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Политики для профилей пользователей
CREATE POLICY "Пользователи могут видеть только свои профили"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Пользователи могут обновлять только свои профили"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Политики для заказов
CREATE POLICY "Пользователи могут видеть только свои заказы"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут создавать только свои заказы"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут обновлять только свои заказы со статусом 'processing'"
    ON orders FOR UPDATE
    USING (auth.uid() = user_id AND status = 'processing');

-- Политики для элементов заказов
CREATE POLICY "Пользователи могут видеть только элементы своих заказов"
    ON order_items FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM orders WHERE id = order_id));

CREATE POLICY "Пользователи могут добавлять элементы только в свои заказы"
    ON order_items FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM orders WHERE id = order_id));

CREATE POLICY "Пользователи могут обновлять элементы только своих заказов со статусом 'processing'"
    ON order_items FOR UPDATE
    USING (auth.uid() IN (SELECT user_id FROM orders WHERE id = order_id AND status = 'processing'));

-- Создаем отдельную роль для администраторов
CREATE ROLE admin;

-- Политики для администраторов
CREATE POLICY "Администраторы имеют полный доступ к профилям" 
    ON profiles FOR ALL 
    TO admin USING (true);

CREATE POLICY "Администраторы имеют полный доступ к заказам" 
    ON orders FOR ALL 
    TO admin USING (true);

CREATE POLICY "Администраторы имеют полный доступ к элементам заказов" 
    ON order_items FOR ALL 
    TO admin USING (true);
