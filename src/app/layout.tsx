import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
      <body className={`${inter.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
