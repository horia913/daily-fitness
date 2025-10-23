import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add the eslint configuration here
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // Add the typescript configuration here
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },

  images: {
    domains: [
      'usmemrjcjsexwterrble.supabase.co', // Supabase storage
    ],
  },
  
  // Service Worker configuration for OneSignal
  async headers() {
    return [
      {
        source: '/OneSignalSDKWorker.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
