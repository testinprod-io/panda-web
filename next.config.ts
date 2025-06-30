import type { NextConfig } from "next";

const isDev = process.env.VERCEL_ENV !== "production";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://*.panda.chat",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://vault.panda.chat http://localhost:3001",
  "frame-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://vault.panda.chat http://localhost:3001",
  "connect-src 'self' https://*.panda.chat https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org https://pulse.walletconnect.org wss://www.walletlink.org https://api.web3modal.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://mainnet.optimism.io",
  "worker-src 'self'",
  "manifest-src 'self'",
]

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,

  async headers() {
    return isDev ? [] : [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: CSP.join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
