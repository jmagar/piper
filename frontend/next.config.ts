import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const nextConfig: NextConfig = {
    // Environment variables are automatically loaded by Next.js
    // from .env files, so we don't need to specify them here
};

export default nextConfig;
