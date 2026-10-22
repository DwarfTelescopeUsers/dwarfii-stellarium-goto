#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MEDIAMTX_VERSION = "v1.20.1";
const MEDIACOMMON_VERSION = "v2.9.3";

const targets = {
  "windows-amd64": {
    goos: "windows",
    goarch: "amd64",
    output: "install/windows/mediamtx.exe",
  },
  "linux-amd64": {
    goos: "linux",
    goarch: "amd64",
    output: "install/linux/mediamtx",
  },
  "linux-arm64": {
    goos: "linux",
    goarch: "arm64",
    output: "install/linux/mediamtx-arm64",
  },
  "linux-armv7": {
    goos: "linux",
    goarch: "arm",
    goarm: "7",
    output: "install/linux/mediamtx-armv7",
  },
  "darwin-amd64": {
    goos: "darwin",
    goarch: "amd64",
    output: "install/macos/mediamtx",
  },
  "darwin-arm64": {
    goos: "darwin",
    goarch: "arm64",
    output: "install/macos/mediamtx-arm64",
  },
};

const aliases = {
  "x86_64-pc-windows-msvc": "windows-amd64",
  "x86_64-unknown-linux-gnu": "linux-amd64",
  "aarch64-unknown-linux-gnu": "linux-arm64",
  "armv7-unknown-linux-gnueabihf": "linux-armv7",
  "x86_64-apple-darwin": "darwin-amd64",
  "aarch64-apple-darwin": "darwin-arm64",
};

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

function clone(repo, tag, destination) {
  run("git", ["clone", "--depth", "1", "--branch", tag, repo, destination]);
}

const requested = process.argv.find((argument) =>
  argument.startsWith("--target="),
);
const requestedTarget = requested?.slice("--target=".length);
const selected = requestedTarget
  ? [aliases[requestedTarget] ?? requestedTarget]
  : Object.keys(targets);

for (const target of selected) {
  if (!targets[target]) {
    throw new Error(`Unsupported MediaMTX target: ${target}`);
  }
}

const repoRoot = path.resolve(__dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dwarfium-mediamtx-"));
const mediaMtxRoot = path.join(tempRoot, "mediamtx");
const mediaCommonRoot = path.join(tempRoot, "mediacommon");

try {
  clone(
    "https://github.com/bluenviron/mediamtx.git",
    MEDIAMTX_VERSION,
    mediaMtxRoot,
  );
  clone(
    "https://github.com/bluenviron/mediacommon.git",
    MEDIACOMMON_VERSION,
    mediaCommonRoot,
  );

  run(
    "git",
    [
      "apply",
      "--unidiff-zero",
      path.join(repoRoot, "patches", "mediacommon-h265-dwarf.patch"),
    ],
    { cwd: mediaCommonRoot },
  );
  run("go", ["test", "./pkg/codecs/h265"], { cwd: mediaCommonRoot });
  run(
    "go",
    [
      "mod",
      "edit",
      "-replace=github.com/bluenviron/mediacommon/v2=../mediacommon",
    ],
    { cwd: mediaMtxRoot },
  );
  run("go", ["mod", "tidy"], { cwd: mediaMtxRoot });
  run("go", ["generate", "./..."], { cwd: mediaMtxRoot });

  for (const name of selected) {
    const target = targets[name];
    const output = path.join(repoRoot, target.output);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    run("go", ["build", "-trimpath", "-ldflags", "-s -w", "-o", output, "."], {
      cwd: mediaMtxRoot,
      env: {
        ...process.env,
        CGO_ENABLED: "0",
        GOOS: target.goos,
        GOARCH: target.goarch,
        ...(target.goarm ? { GOARM: target.goarm } : {}),
      },
    });
    if (target.goos !== "windows") fs.chmodSync(output, 0o755);
    console.log(`Built ${name}: ${target.output}`);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
