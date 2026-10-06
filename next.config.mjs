/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Avoid picking a parent lockfile as the Turbopack root (breaks module resolution).
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
