import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
