/** @type {import('next').NextConfig} */
const nextConfig = {
  // The reviewed SDK is ESM; next/jest must transform it after a clean install.
  transpilePackages: ["dwarfii_api"],
  outputFileTracingRoot: __dirname,
  // unoptimized - When true, the source image will be served as-is instead of changing quality,
  // size, or format. Defaults to false.
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  distDir: "dist",
  trailingSlash: true,
};

if (
  process.env.NEXT_PUBLIC_URL_PROXY_CORS &&
  process.env.NEXT_PUBLIC_URL_PROXY_CORS.startsWith("http")
) {
  nextConfig.output = "export";
  // Static desktop/standalone builds use the packaged proxy server. Exclude
  // Next API routes from this target so the export contains only UI pages.
  nextConfig.pageExtensions = ["tsx", "jsx"];
}
module.exports = nextConfig;
