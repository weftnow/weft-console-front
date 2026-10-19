import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opt-in for local runners that cannot open Turbopack plugin IPC sockets.
  experimental: process.env.WEFT_LOCAL_PLUGIN_THREADS === "1" && process.env.VERCEL !== "1"
    ? { turbopackPluginRuntimeStrategy: "workerThreads" }
    : undefined,
};

export default nextConfig;
