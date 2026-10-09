import type { NextConfig } from "next";
const config: NextConfig = {
  agentRules: false,
  devIndicators: false,
  poweredByHeader: false,
  output: "export",
  trailingSlash: true,
};
export default config;
