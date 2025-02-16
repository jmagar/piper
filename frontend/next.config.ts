import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const nextConfig: NextConfig = {
  env: process.env
};

export default nextConfig;
