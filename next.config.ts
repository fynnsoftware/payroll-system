import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xrjltusgtgxywmrzqcch.supabase.co",
      },
    ],
  },
  reactCompiler: true,
};

export default nextConfig;
