import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Настраиваем Inter с поддержкой кириллицы
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
  // Отключаем автоматическую предзагрузку, так как next/font уже оптимизирует загрузку
  preload: true,
  // Добавляем корректные веса шрифта для улучшения производительности
  weight: ['400', '500', '600', '700'],
  // Добавляем русский текст
  fallback: ['Arial', 'sans-serif'],
  adjustFontFallback: true
});

export const metadata: Metadata = {
  title: "AAS - Формирование заказов на бесплатную еду",
  description: "Приложение для формирования и отслеживания заказов на бесплатную еду",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      {/* next/font уже добавляет необходимые мета-теги в head */}
      <body className={`${inter.className} ${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
