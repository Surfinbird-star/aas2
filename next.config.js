/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Игнорировать ошибки ESLint во время сборки
    ignoreDuringBuilds: true,
  },
  // Отключаем строгий режим для TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
