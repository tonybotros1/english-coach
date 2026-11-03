import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // ffmpeg ships as a native binary: load it with plain Node require and make sure Vercel includes it.
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/speech/*": ["./node_modules/ffmpeg-static/ffmpeg*"],
  },
};

export default nextConfig;
