const isGHP = process.env.GH_PAGES || false;
let assetPrefix = "";
let basePath = "";

if (isGHP) {
  const repo = "dwarfii-stellarium-goto";
  assetPrefix = `/${repo}/`;
  basePath = `/${repo}`;
}

const nextConfig = {
  assetPrefix: assetPrefix,
  basePath: basePath,
  reactStrictMode: true,
  output: "export",
  distDir: "docs",
};

module.exports = nextConfig;
