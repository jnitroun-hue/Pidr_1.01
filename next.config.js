/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // ✅ ОПТИМИЗАЦИЯ ИЗОБРАЖЕНИЙ
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'pidr-1-01.vercel.app',
      },
    ],
  },
  
  // ✅ СЖАТИЕ И КЭШИРОВАНИЕ
  compress: true,
  poweredByHeader: false,
  
  // ✅ ЭКСПЕРИМЕНТАЛЬНЫЕ ФИЧИ ДЛЯ СКОРОСТИ
  experimental: {
    // optimizeCss: true, // ❌ ОТКЛЮЧЕНО - вызывает ошибку "Cannot find module 'critters'" на Vercel
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
  
  // ✅ WEBPACK ОПТИМИЗАЦИЯ
  webpack: (config, { dev, isServer }) => {
    // Сжатие в production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            }
          }
        }
      };
    }
    
    return config;
  },
  
  // ✅ ОБРАБОТКА ОШИБОК CHUNK LOADING
  onDemandEntries: {
    // Период в мс, в течение которого страницы остаются в памяти
    maxInactiveAge: 25 * 1000,
    // Количество страниц, которые должны одновременно оставаться в памяти
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;

