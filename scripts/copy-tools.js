const os = require("os");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const unzipper = require("unzipper");

const platform = os.platform(); // 'win32', 'linux', 'darwin'
const arch = os.arch(); // 'x64', 'arm64', 'arm'

const filesToCopy = {
  win32: [
    {
      source: "./install/windows/DwarfiumProxy.exe",
      destination: `./src-tauri/bin/DwarfiumProxy-x86_64-pc-windows-msvc.exe`
    },
    {
      source: "./install/windows/mediamtx.exe",
      destination: `./src-tauri/bin/mediamtx-x86_64-pc-windows-msvc.exe`
    }
  ],
  linux: [
    ...(arch === "x64"
      ? [
          {
            source: "./install/linux/DwarfiumProxy",
            destination: `./src-tauri/bin/DwarfiumProxy-x86_64-unknown-linux-gnu`
          },
          {
            source: "./install/linux/mediamtx",
            destination: `./src-tauri/bin/mediamtx-x86_64-unknown-linux-gnu`
          }
        ]
      : arch === "arm64"
      ? [
          {
            source: "./install/linux/DwarfiumProxy-arm64",
            destination: `./src-tauri/bin/DwarfiumProxy-aarch64-unknown-linux-gnu`
          },
          {
            source: "./install/linux/mediamtx-arm64",
            destination: `./src-tauri/bin/mediamtx-aarch64-unknown-linux-gnu`
          }
        ]
      : arch === "arm"
      ? [
          {
            source: "./install/linux/DwarfiumProxy-armv7",
            destination: `./src-tauri/bin/DwarfiumProxy-armv7-unknown-linux-gnueabihf`
          },
          {
            source: "./install/linux/mediamtx-armv7",
            destination: `./src-tauri/bin/mediamtx-armv7-unknown-linux-gnueabihf`
          }
        ]
      : [])
  ],
  darwin: [
    ...(arch === "x64"
      ? [
          {
            source: "./install/macos/DwarfiumProxy",
            destination: `./src-tauri/bin/DwarfiumProxy-x86_64-apple-darwin`
          },
          {
            source: "./install/macos/mediamtx",
            destination: `./src-tauri/bin/mediamtx-x86_64-apple-darwin`
          }
        ]
      : arch === "arm64"
      ? [
          {
            source: "./install/macos/DwarfiumProxy-arm64",
            destination: `./src-tauri/bin/DwarfiumProxy-aarch64-apple-darwin`
          },
          {
            source: "./install/macos/mediamtx-arm64",
            destination: `./src-tauri/bin/mediamtx-aarch64-apple-darwin`
          }
        ]
      : [])
  ]
};

// Check if platform and architecture are supported
const files = filesToCopy[platform];
if (!files || files.length === 0) {
  console.error(`Unsupported platform/architecture: ${platform}-${arch}`);
  process.exit(1);
}

// Function to copy files
async function copyFiles() {
  for (const { source, destination } of files) {
    try {
      const destinationDir = "./src-tauri/bin";
      // Ensure the destination directory exists
      console.log(`Ensuring directory exists: ${destinationDir}`);
      await fs.mkdir(destinationDir, { recursive: true });

      console.log(`Copying ${source} to ${destination}`);
      await fs.copyFile(source, destination);
      console.log(`Successfully copied ${source} to ${destination}`);

      // Add executable rights
      console.log(`Adding executable rights to ${destination}`);
      await fs.chmod(destination, 0o755); // Set file permissions to rwxr-xr-x
      console.log(`Executable rights added to ${destination}`);
    } catch (err) {
      console.error(`Failed to copy ${source} to ${destination}: ${err.message}`);
    }
  }
}

// Function to copy the config file
async function copyConfigFileTauri() {
  const source = "./install/config/mediamtx.yml";
  const destination = `./src-tauri/mediamtx.yml`;

  try {
    // Copy the file
    console.log(`Copying ${source} to ${destination}`);
    await fs.copyFile(source, destination);
    console.log(`Successfully copied ${source} to ${destination}`);
  } catch (err) {
    console.error(`Failed to copy ${source} to ${destination}: ${err.message}`);
  }}

async function copyBleResourcesTauri() {
  const root = path.resolve("./src-tauri/extern");
  await fs.mkdir(root, { recursive: true });
  if (platform !== "win32") return;

  const archive = await unzipper.Open.file("./install/windows/extern/extern.zip");
  for (const entry of archive.files) {
    const target = path.resolve(root, entry.path);
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error(`Unsafe BLE archive entry: ${entry.path}`);
    }
    if (entry.type === "Directory") {
      await fs.mkdir(target, { recursive: true });
      continue;
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await pipeline(entry.stream(), fsSync.createWriteStream(target));
  }
  await fs.access(path.join(root, "connect_bluetooth.exe"));
  await fs.copyFile("./install/extern/config.ini", path.join(root, "config.ini"));
  console.log("Bundled direct Bluetooth helper for the desktop proxy");
}

async function main() {
  await copyFiles();
  await copyConfigFileTauri();
  await copyBleResourcesTauri();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
