const { execSync } = require("child_process");
const os = require("os");

const platform = os.platform(); // 'win32', 'linux', 'darwin'
const arch = os.arch(); // 'x64', 'arm64'

const targets = {
  win32: {
    x64: "node24-win-x64",
  },
  linux: {
    x64: "node24-linux-x64",
    arm64: "node24-linux-arm64",
    arm: "node24-linux-armv7",
  },
  darwin: {
    x64: "node24-macos-x64",
    arm64: "node24-macos-arm64",
  },
};

const outputPaths = {
  win32: {
    x64: "./install/windows/DwarfiumProxy.exe",
  },
  linux: {
    x64: "./install/linux/DwarfiumProxy",
    arm64: "./install/linux/DwarfiumProxy-arm64",
    arm: "./install/linux/DwarfiumProxy-armv7",
  },
  darwin: {
    x64: "./install/macos/DwarfiumProxy",
    arm64: "./install/macos/DwarfiumProxy-arm64",
  },
};

const outputPathsCert = {
  win32: {
    x64: "./install/windows/createSSLcert.exe",
  },
  linux: {
    x64: "./install/linux/createSSLcert",
    arm64: "./install/linux/createSSLcert-arm64",
    arm: "./install/linux/createSSLcert-armv7",
  },
  darwin: {
    x64: "./install/macos/createSSLcert",
    arm64: "./install/macos/createSSLcert-arm64",
  },
};

const target = targets[platform]?.[arch];
const outputPath = outputPaths[platform]?.[arch];
const outputPathCert = outputPathsCert[platform]?.[arch];

if (!target || !outputPath) {
  console.error(`Unsupported platform/architecture: ${platform}-${arch}`);
  process.exit(1);
}

console.log(`Building Proxy server for ${platform}-${arch}`);
execSync(`pkg server/server.js --targets ${target} -o ${outputPath}`, {
  stdio: "inherit",
});
execSync(
  `pkg server/createSSLcert.js --targets ${target} -o ${outputPathCert}`,
  { stdio: "inherit" }
);
