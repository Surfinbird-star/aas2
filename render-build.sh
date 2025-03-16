#!/bin/bash

# Скрипт для успешной сборки на Render.com

# Очистка кэша и установка зависимостей
echo "Очистка и установка зависимостей..."
rm -rf node_modules package-lock.json .next

# Установка TypeScript глобально для доступности в PATH
echo "Установка TypeScript глобально..."
npm install -g typescript

# Установка зависимостей с принудительным разрешением
echo "Установка зависимостей проекта..."
npm install --force

# Сборка приложения
echo "Сборка приложения..."
npm run build

echo "Сборка завершена!"
