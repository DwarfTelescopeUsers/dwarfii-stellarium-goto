const isGithub = process.env.GITHUB_REPOSITORY ? true : false;
let assetPrefix = "";
let basePath = "";

if (isGithub) {
  const repo = process.env.GITHUB_REPOSITORY?.replace(/.*?\//, "");
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
