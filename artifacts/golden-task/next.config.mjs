/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow Replit preview proxy origins
  allowedDevOrigins: ["*.replit.dev", "*.replit.app", "*.worf.replit.dev", "*.kirk.replit.dev"],
}

export default nextConfig
