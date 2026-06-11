import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/admin',
        destination: 'https://skelar-vault.vercel.app/admin',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
