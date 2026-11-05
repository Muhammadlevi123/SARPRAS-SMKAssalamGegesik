import type { NextConfig } from "next";

// Header keamanan untuk semua halaman
const HEADER_KEAMANAN = [
  { key: "X-Frame-Options", value: "DENY" }, // tidak bisa dimasukkan ke iframe situs lain (anti-clickjacking)
  { key: "X-Content-Type-Options", value: "nosniff" }, // browser tidak menebak-nebak jenis file
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  // Paksa HTTPS (browser mengabaikan header ini kalau situs dibuka lewat http)
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // sembunyikan "X-Powered-By: Next.js"
  serverExternalPackages: ["exceljs"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: HEADER_KEAMANAN }];
  },
};

export default nextConfig;