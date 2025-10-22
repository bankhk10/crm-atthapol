/**
 * Next.js configuration
 * - Disable ESLint during production builds so warnings don’t fail build
 */
/** @type {import('next').NextConfig} */
const config = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;

