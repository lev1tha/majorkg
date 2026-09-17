/** @type {import('next').NextConfig} */

// Бэкенд живет отдельным процессом. Проксируем /api/* на него, чтобы
// cookie сессии оставалась same-origin и в dev, и в проде.
const API_URL = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "")

const nextConfig = {
  reactStrictMode: true,
  images: {
    // Аватары игроков отдает CDN Steam — других внешних картинок в проекте нет.
    remotePatterns: [
      { protocol: "https", hostname: "avatars.steamstatic.com" },
      { protocol: "https", hostname: "avatars.akamai.steamstatic.com" },
      { protocol: "https", hostname: "avatars.cloudflare.steamstatic.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }]
  },
}

export default nextConfig
