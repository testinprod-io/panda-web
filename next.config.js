/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // SVG Configuration
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            typescript: true,
            icon: true
          }
        }
      ]
    });

    return config;
  }
};

module.exports = nextConfig; 