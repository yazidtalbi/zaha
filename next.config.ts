/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  turbopack: {}, // fixes “empty turbopack config” message
};

export default nextConfig;
