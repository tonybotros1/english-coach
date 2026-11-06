import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // ffmpeg ships as a native binary: load it with plain Node require and make sure Vercel includes it.
  serverExternalPackages: ["ffmpeg-static"],
  // Every route that converts recordings with lib/audio.ts needs the binary in its bundle.
  outputFileTracingIncludes: {
    "/api/speech/assess": ["./node_modules/ffmpeg-static/ffmpeg*"],
    "/api/placement/speaking": ["./node_modules/ffmpeg-static/ffmpeg*"],
    "/api/lessons/shadow": ["./node_modules/ffmpeg-static/ffmpeg*"],
    "/api/lessons/talk": ["./node_modules/ffmpeg-static/ffmpeg*"],
  },
};

export default nextConfig;
