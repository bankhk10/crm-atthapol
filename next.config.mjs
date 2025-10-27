/**
 * Next.js configuration
 * - Disable ESLint during production builds so warnings don’t fail build
 * - Trust proxy host header and allow Server Actions from dev tunnel origins
 */
/** @type {import('next').NextConfig} */
const config = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Behind reverse proxies/tunnels, trust the forwarded host
  experimental: {
    trustHostHeader: true,
  },
  // Allow Server Actions to accept requests where Origin and x-forwarded-host
  // may differ (e.g. localhost <-> devtunnels) by whitelisting expected origins
  serverActions: {
    allowedOrigins: [
      "localhost:3000",
      "127.0.0.1:3000",
      "*.asse.devtunnels.ms",
      "*.ngrok.io",
      "*.ngrok-free.app",
      process.env.TUNNEL_HOST,
      process.env.NEXT_PUBLIC_TUNNEL_HOST,
    ].filter(Boolean),
  },
};

export default config;

