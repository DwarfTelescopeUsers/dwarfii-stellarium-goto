const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");
const { pipeline } = require("stream/promises");

const DIST_DIR = path.resolve("dist");
const DEPLOY_DIR = path.resolve("Dwarfium");

// Clean up any previous deployment directory
if (fs.existsSync(DEPLOY_DIR)) {
  fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
}

// Copy application build to the deployment directory (cross-platform)
console.log("Copying application build...");
fs.mkdirSync(DEPLOY_DIR, { recursive: true });

const copyFilesRecursively = (src, dest) => {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  entries.forEach((entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyFilesRecursively(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
};

copyFilesRecursively(DIST_DIR, DEPLOY_DIR);

// Function to create a directory inside DEPLOY_DIR
function createDir(baseDir, dirName) {
  const dirPath = path.join(baseDir, dirName);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true }); // recursive: true allows nested directories
    console.log(`Directory created: ${dirPath}`);
  } else {
    console.log(`Directory already exists: ${dirPath}`);
  }
}

createDir(DEPLOY_DIR, "extern");
const os = require("os");

// Copy tools to the deployment directory
const platform = process.platform; // 'win32', 'linux', 'darwin'
const arch = os.arch(); // 'x64', 'arm64', 'arm'

const tools =
  {
    win32: {
      x64: [
        {
          src: "./install/windows/stellarium_auto_config.exe",
          dest: "stellarium_auto_config.exe",
        },
        {
          src: "./src-tauri/bin/DwarfiumProxy-x86_64-pc-windows-msvc.exe",
          dest: "DwarfiumProxy.exe",
        },
        {
          src: "./install/windows/createSSLcert.exe",
          dest: "createSSLcert.exe",
        },
        {
          src: "./src-tauri/bin/mediamtx-x86_64-pc-windows-msvc.exe",
          dest: "mediamtx.exe",
        },
        { src: "./install/config/mediamtx.yml", dest: "mediamtx.yml" },
        {
          src: "./install/config/mediamtx-https.yml",
          dest: "mediamtx-https.yml",
        },
        { src: "./install/start_dwarfium.py", dest: "start_dwarfium.py" },
        { src: "./install/windows/extern/extern.zip", dest: "./extern" },
        { src: "./install/extern/config.ini", dest: "./extern/config.ini" },
        { src: "./install/extern/config.py", dest: "./extern/config.py" },
      ],
    },
    linux: {
      x64: [
        {
          src: "./install/linux/stellarium_auto_config",
          dest: "stellarium_auto_config",
        },
        {
          src: "./src-tauri/bin/DwarfiumProxy-x86_64-unknown-linux-gnu",
          dest: "DwarfiumProxy",
        },
        { src: "./install/linux/createSSLcert", dest: "createSSLcert" },
        {
          src: "./src-tauri/bin/mediamtx-x86_64-unknown-linux-gnu",
          dest: "mediamtx",
        },
        { src: "./install/config/mediamtx.yml", dest: "mediamtx.yml" },
        {
          src: "./install/config/mediamtx-https.yml",
          dest: "mediamtx-https.yml",
        },
        { src: "./install/start_dwarfium.py", dest: "start_dwarfium.py" },
        { src: "./install/extern/config.ini", dest: "./extern/config.ini" },
        { src: "./install/extern/config.py", dest: "./extern/config.py" },
      ],
      arm64: [
        {
          src: "./install/linux/stellarium_auto_config",
          dest: "stellarium_auto_config",
        },
        {
          src: "./src-tauri/bin/DwarfiumProxy-aarch64-unknown-linux-gnu",
          dest: "DwarfiumProxy",
        },
        { src: "./install/linux/createSSLcert-arm64", dest: "createSSLcert" },
        {
          src: "./src-tauri/bin/mediamtx-aarch64-unknown-linux-gnu",
          dest: "mediamtx",
        },
        { src: "./install/config/mediamtx.yml", dest: "mediamtx.yml" },
        {
          src: "./install/config/mediamtx-https.yml",
          dest: "mediamtx-https.yml",
        },
        { src: "./install/start_dwarfium.py", dest: "start_dwarfium.py" },
        { src: "./install/extern/config.ini", dest: "./extern/config.ini" },
        { src: "./install/extern/config.py", dest: "./extern/config.py" },
      ],
      arm: [
        {
          src: "./install/linux/stellarium_auto_config",
          dest: "stellarium_auto_config",
        },
        {
          src: "./src-tauri/bin/DwarfiumProxy--armv7-unknown-linux-gnu",
          dest: "DwarfiumProxy",
        },
        { src: "./install/linux/createSSLcert-armv7", dest: "createSSLcert" },
        {
          src: "./src-tauri/bin/mediamtx--armv7-unknown-linux-gnu",
          dest: "mediamtx",
        },
        { src: "./install/config/mediamtx.yml", dest: "mediamtx.yml" },
        {
          src: "./install/config/mediamtx-https.yml",
          dest: "mediamtx-https.yml",
        },
        { src: "./install/start_dwarfium.py", dest: "start_dwarfium.py" },
        { src: "./install/extern/config.ini", dest: "./extern/config.ini" },
        { src: "./install/extern/config.py", dest: "./extern/config.py" },
      ],
    },
    darwin: {
      x64: [
        {
          src: "./src-tauri/bin/DwarfiumProxy-x86_64-apple-darwin",
          dest: "DwarfiumProxy",
        },
        {
          src: "./src-tauri/bin/mediamtx-x86_64-apple-darwin",
          dest: "mediamtx",
        },
        { src: "./install/macos/createSSLcert", dest: "createSSLcert" },
        { src: "./install/config/mediamtx.yml", dest: "mediamtx.yml" },
        {
          src: "./install/config/mediamtx-https.yml",
          dest: "mediamtx-https.yml",
        },
        { src: "./install/start_dwarfium.py", dest: "start_dwarfium.py" },
        { src: "./install/extern/config.ini", dest: "./extern/config.ini" },
        { src: "./install/extern/config.py", dest: "./extern/config.py" },
      ],
      arm64: [
        {
          src: "./src-tauri/bin/DwarfiumProxy-aarch64-apple-darwin",
          dest: "DwarfiumProxy",
        },
        {
          src: "./src-tauri/bin/mediamtx-aarch64-apple-darwin",
          dest: "mediamtx",
        },
        { src: "./install/macos/createSSLcert-arm64", dest: "createSSLcert" },
        { src: "./install/config/mediamtx.yml", dest: "mediamtx.yml" },
        {
          src: "./install/config/mediamtx-https.yml",
          dest: "mediamtx-https.yml",
        },
        { src: "./install/start_dwarfium.py", dest: "start_dwarfium.py" },
        { src: "./install/extern/config.ini", dest: "./extern/config.ini" },
        { src: "./install/extern/config.py", dest: "./extern/config.py" },
      ],
    },
  }[platform]?.[arch] || [];

console.log("Copying tools...");
tools.forEach(({ src, dest }) => {
  const destPath = path.join(DEPLOY_DIR, dest);
  if (!fs.existsSync(src)) {
    console.log(`Source file {src} does not exist.`);
  }
  // Check if the file is a ZIP file
  else if (src.endsWith(".zip")) {
    // Extract entries individually and await their streams. unzipper.Extract
    // silently omitted two Python modules from extern.zip in the Windows
    // standalone package, leaving Direct Bluetooth unable to start.
    void unzipper.Open.file(src)
      .then(async (archive) => {
        const root = path.resolve(destPath);
        for (const entry of archive.files) {
          const target = path.resolve(root, entry.path);
          if (target !== root && !target.startsWith(root + path.sep)) {
            throw new Error(`Unsafe ZIP entry: ${entry.path}`);
          }
          if (entry.type === "Directory") {
            fs.mkdirSync(target, { recursive: true });
            continue;
          }
          fs.mkdirSync(path.dirname(target), { recursive: true });
          await pipeline(entry.stream(), fs.createWriteStream(target));
        }
        console.log(`Unzipped ${src} to ${destPath}`);
      })
      .catch((error) => {
        console.error(`Could not unpack ${src}:`, error);
        process.exitCode = 1;
      });
  } else {
    fs.copyFileSync(src, destPath);
    fs.chmodSync(destPath, 0o755); // Ensure executable permissions
    console.log("File copied successfully.");
  }
});

// Copy configuration file
console.log("Copying configuration...");
const launcherScriptWindows = `
@echo off
cd /d "%~dp0"
if not exist var\\log mkdir var\\log
rem Start DwarfiumProxy minimized
start "" /Min cmd /c "DwarfiumProxy.exe >> var\\log\\DwarfiumProxy.log 2>&1"

rem Check if HTTPS is running by trying to connect to proxy on the HTTPS port
setlocal enabledelayedexpansion

rem MediaMTX must use the same certificate pair as the web server and proxy.
if not exist DwarfiumCert.pem if exist DwarfiumServerCert.pem if exist DwarfiumServerKey.pem (
    set MTX_HLSSERVERCERT=DwarfiumServerCert.pem
    set MTX_HLSSERVERKEY=DwarfiumServerKey.pem
)

rem Try to request https://localhost:9443 and capture response
for /f "tokens=*" %%i in ('curl -k --silent --retry 5 --retry-delay 1 --retry-connrefused --max-time 2 https://127.0.0.1:9443/health') do set RESPONSE=%%i

rem Check if the response contains "error"
echo %RESPONSE% | find /i "status" >nul
if %ERRORLEVEL% equ 0 (
    echo HTTPS detected, using mediamtx-https.yml
    start "" /Min cmd /c "mediamtx.exe mediamtx-https.yml >> var\\log\\mediamtx.log 2>&1"
) else (
    echo HTTPS not detected, using mediamtx.yml
    start "" /Min cmd /c "mediamtx.exe mediamtx.yml >> var\\log\\mediamtx.log 2>&1"
)

rem Check if Python is installed
where python >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python to run the HTTP server.
    pause
    exit /b
)

rem Start Python HTTP server minimized
start "" /Min cmd /c "python -u start_dwarfium.py >> var\\log\\server.log 2>&1"

echo All tools and server have been started.
pause
`;

const launcherScriptLinuxMac = `
#!/bin/bash

# Ensure script exits on error
set -e

cd -- "$(dirname "$0")"
mkdir -p var/log

# Start DwarfiumProxy
nohup ./DwarfiumProxy >> var/log/DwarfiumProxy.log 2>&1 &

if [ ! -f DwarfiumCert.pem ] && [ -f DwarfiumServerCert.pem ] && [ -f DwarfiumServerKey.pem ]; then
    export MTX_HLSSERVERCERT=DwarfiumServerCert.pem
    export MTX_HLSSERVERKEY=DwarfiumServerKey.pem
fi

# Check if HTTPS is running on port 9443
RESPONSE=$(curl -k --silent --retry 5 --retry-delay 1 --retry-connrefused --max-time 2 https://127.0.0.1:9443/health || true)

if echo "$RESPONSE" | grep -qi "status"; then
    echo "HTTPS detected, using mediamtx-https.yml"
    nohup ./mediamtx mediamtx-https.yml >> var/log/mediamtx.log 2>&1 &
else
    echo "HTTPS not detected, using mediamtx.yml"
    nohup ./mediamtx mediamtx.yml >> var/log/mediamtx.log 2>&1 &
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python3 is not installed. Please install Python3 to run the HTTP server."
    exit 1
fi

# Start Python HTTP server
nohup python3 -u start_dwarfium.py >> var/log/server.log 2>&1 &

echo "All tools and server have been started."
`;

if (platform == "win32")
  fs.writeFileSync(
    path.join(DEPLOY_DIR, "launch-server&tools.bat"),
    launcherScriptWindows,
    { mode: 0o755 },
  );
else
  fs.writeFileSync(
    path.join(DEPLOY_DIR, "launch-server&tools.sh"),
    launcherScriptLinuxMac,
    { mode: 0o755 },
  );
