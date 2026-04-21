import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uhifpblbfrphubgakdpo.supabase.co",
      },
    ],
  },
  reactCompiler: true,
};

export default nextConfig;
