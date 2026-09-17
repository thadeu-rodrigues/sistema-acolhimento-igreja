import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.15.6",
    "192.168.15.6:3000",
    "localhost",
    "localhost:3000",
  ],
};

export default nextConfig;
