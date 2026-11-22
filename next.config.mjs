/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'jsdom', '@mozilla/readability'],
  },
  webpack: (config) => {
    // Canvas 등 브라우저/서버 외부 의존성 폴백
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
