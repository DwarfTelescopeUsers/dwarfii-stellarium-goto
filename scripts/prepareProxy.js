const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");

const DEPLOY_DIR = path.resolve("DwarfiumProxy");

// Clean up any previous deployment directory
if (fs.existsSync(DEPLOY_DIR)) {
  fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
}

// Copy application build to the deployment directory (cross-platform)
console.log("Copying application build...");
fs.mkdirSync(DEPLOY_DIR, { recursive: true });

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

// Copy tools to the deployment directory
const platform = process.platform; // 'win32', 'linux', 'darwin'
const tools =
  {
    win32: [
      {
        src: "./src-tauri/bin/DwarfiumProxy-x86_64-pc-windows-msvc.exe",
        dest: "DwarfiumProxy.exe",
      },
      { src: "./install/windows/createSSLcert.exe", dest: "createSSLcert.exe" },
      {
        src: "./src-tauri/bin/mediamtx-x86_64-pc-windows-msvc.exe",
        dest: "mediamtx.exe",
      },
      { src: "./install/config/mediamtx.yml", dest: "mediamtx.yml" },
      {
        src: "./install/config/mediamtx-https.yml",
        dest: "mediamtx-https.yml",
      },
      { src: "./install/windows/extern/extern.zip", dest: "./extern" },
      { src: "./install/extern/config.ini", dest: "./extern/config.ini" },
      { src: "./install/extern/config.py", dest: "./extern/config.py" },
    ],
    linux: [
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
      { src: "./install/extern/config.ini", dest: "./extern/config.ini" },
      { src: "./install/extern/config.py", dest: "./extern/config.py" },
    ],
    darwin: [
      {
        src: "./src-tauri/bin/DwarfiumProxy-x86_64-apple-darwin",
        dest: "DwarfiumProxy",
      },
      { src: "./install/macos/createSSLcert", dest: "createSSLcert" },
      { src: "./src-tauri/bin/mediamtx-x86_64-apple-darwin", dest: "mediamtx" },
      { src: "./install/config/mediamtx.yml", dest: "mediamtx.yml" },
      {
        src: "./install/config/mediamtx-https.yml",
        dest: "mediamtx-https.yml",
      },
      { src: "./install/extern/config.ini", dest: "./extern/config.ini" },
      { src: "./install/extern/config.py", dest: "./extern/config.py" },
    ],
  }[platform] || [];

console.log("Copying tools...");
tools.forEach(({ src, dest }) => {
  const destPath = path.join(DEPLOY_DIR, dest);
  // Check if the file is a ZIP file
  if (src.endsWith(".zip")) {
    // Unzip the file to the destination path
    fs.createReadStream(src)
      .pipe(unzipper.Extract({ path: destPath }))
      .on("close", () => {
        console.log(`Unzipped ${src} to ${destPath}`);
      });
  } else {
    fs.copyFileSync(src, destPath);
    fs.chmodSync(destPath, 0o755); // Ensure executable permissions
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

echo All tools have been started.
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

echo "All tools have been started."
`;

if (platform == "win32")
  fs.writeFileSync(
    path.join(DEPLOY_DIR, "launch-tools.bat"),
    launcherScriptWindows,
    { mode: 0o755 },
  );
else
  fs.writeFileSync(
    path.join(DEPLOY_DIR, "launch-tools.sh"),
    launcherScriptLinuxMac,
    { mode: 0o755 },
  );
