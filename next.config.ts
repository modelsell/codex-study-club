import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // This standalone app does not depend on files outside the repository.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  async headers() {
    return [{
      source: "/templates/deepagents-storage-requirements.txt",
      headers: [{ key: "Content-Disposition", value: 'attachment; filename="deepagents-storage-requirements.txt"' }],
    }];
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
