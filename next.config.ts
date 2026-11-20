import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The project AGENTS.md already carries the Next.js warning; stop `next dev` from appending its own copy.
  agentRules: false,
};

export default nextConfig;
