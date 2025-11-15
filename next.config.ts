/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Either use domains:
    domains: ["picsum.photos"],

    // …or remotePatterns (more precise):
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
