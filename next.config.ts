import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ['@chakra-ui/react']
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Улучшенная обработка ошибок для production
  onDemandEntries: {
    // Период в мс для того чтобы страница оставалась в буфере
    maxInactiveAge: 25 * 1000,
    // Кол-во страниц которые должны храниться одновременно в буфере
    pagesBufferLength: 2,
  },
  // Оптимизация для Telegram WebApp
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ]
  }
};

export default nextConfig;
