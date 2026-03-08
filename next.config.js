/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 180,
  async redirects() {
    return [
      {
        source: '/client/lifestyle',
        destination: '/client/me',
        permanent: true,
      },
      {
        source: '/client/menu',
        destination: '/client/me',
        permanent: true,
      },
      {
        source: '/client/achievements',
        destination: '/client/progress/achievements',
        permanent: true,
      },
      {
        source: '/client/profile/info',
        destination: '/client/profile',
        permanent: true,
      },
      {
        source: '/client/scheduling',
        destination: '/client',
        permanent: true,
      },
      {
        source: '/client/sessions',
        destination: '/client',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
