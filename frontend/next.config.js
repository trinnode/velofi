/** @type {import('next').NextConfig} */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  generateEtags: false,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Environment variables
  env: {
    CUSTOM_KEY: "my-value",
  },

  // Headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Webpack configuration
  webpack: (config) => {
    // Important: return the modified config
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Add support for importing SVGs as React components
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ["@svgr/webpack"],
    });

    return config;
  },

  // Bundle analyzer
  ...(process.env.ANALYZE === "true" && {
    webpack: (config, options) => {
      if (!options.isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
        };
      }
      return config;
    },
  }),

  // Redirects
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },

  // Rewrites for API routes
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "/api/auth/:path*",
      },
    ];
  },

  // Output configuration
  output: "standalone",

  // Fix workspace root warning for monorepo deployment
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // Experimental features
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
      "date-fns",
    ],
  },

  // Typed routes configuration
  typedRoutes: true,
};

module.exports = nextConfig;
