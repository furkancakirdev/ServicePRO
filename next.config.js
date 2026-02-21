/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/dispatch',
        destination: '/takvim',
        permanent: true,
      },
      {
        source: '/dispatch/:path*',
        destination: '/takvim',
        permanent: true,
      },
      {
        source: '/calls',
        destination: '/talepler?source=telefon',
        permanent: true,
      },
      {
        source: '/calls/:path*',
        destination: '/talepler?source=telefon',
        permanent: true,
      },
      {
        source: '/pricebook',
        destination: '/ayarlar/devre-disi?modul=pricebook',
        permanent: true,
      },
      {
        source: '/pricebook/:path*',
        destination: '/ayarlar/devre-disi?modul=pricebook',
        permanent: true,
      },
      {
        source: '/templates',
        destination: '/ayarlar/devre-disi?modul=sablon',
        permanent: true,
      },
      {
        source: '/templates/:path*',
        destination: '/ayarlar/devre-disi?modul=sablon',
        permanent: true,
      },
      {
        source: '/jobs',
        destination: '/is-emirleri',
        permanent: true,
      },
      {
        source: '/jobs/yeni',
        destination: '/is-emirleri/yeni',
        permanent: true,
      },
      {
        source: '/jobs/:id/edit',
        destination: '/is-emirleri/:id/edit',
        permanent: true,
      },
      {
        source: '/jobs/:path*',
        destination: '/is-emirleri/:path*',
        permanent: true,
      },
      {
        source: '/servisler',
        destination: '/is-emirleri',
        permanent: true,
      },
      {
        source: '/servisler/yeni',
        destination: '/is-emirleri/yeni',
        permanent: true,
      },
      {
        source: '/servisler/:id/duzenle',
        destination: '/is-emirleri/:id/edit',
        permanent: true,
      },
      {
        source: '/servisler/:path*',
        destination: '/is-emirleri/:path*',
        permanent: true,
      },
      {
        source: '/services',
        destination: '/is-emirleri',
        permanent: true,
      },
      {
        source: '/services/:path*',
        destination: '/is-emirleri/:path*',
        permanent: true,
      },
      {
        source: '/leads',
        destination: '/talepler',
        permanent: true,
      },
      {
        source: '/leads/:path*',
        destination: '/talepler/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
