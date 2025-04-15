import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  },
  experimental: {
    turbo: {
      rules: {
        // Configure Turbopack to handle SVGs
        '*.svg': {
          loaders: ['@svgr/webpack'],
        },
      },
    },
  },
};


export default nextConfig;
