import { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import unzipper from "unzipper"; // Install with `npm install unzipper`
import {
  buildBleCommandArguments,
  getBleDeviceNames,
  parseBleHelperOutput,
} from "../../../server/ble-helper";

interface Config {
  DWARF_IP?: string;
  DWARF_ID?: string;
}

const INSTALL_DIR = path.resolve("./install");
const EXTERN_DIR = path.join(INSTALL_DIR, "extern");
const ZIP_PATH =
  process.platform === "win32"
    ? path.join(INSTALL_DIR, "windows", "extern", "extern.zip")
    : path.join(INSTALL_DIR, "linux", "extern", "extern.zip");
const EXE_NAME = "connect_bluetooth";
const CONFIG_PATH = path.join(EXTERN_DIR, "config.py");

async function ensureUnzipped(): Promise<void> {
  const exePath =
    process.platform === "win32"
      ? path.join(EXTERN_DIR, `${EXE_NAME}.exe`)
      : `./${path.join(EXTERN_DIR, EXE_NAME)}`;

  if (fs.existsSync(EXTERN_DIR) && fs.existsSync(exePath)) {
    return; // ? Already extracted, no need to unzip again
  }

  if (!fs.existsSync(ZIP_PATH)) {
    throw new Error(`Zip file not found: ${ZIP_PATH}`);
  }

  console.log("Extracting extern.zip...");
  await fs
    .createReadStream(ZIP_PATH)
    .pipe(unzipper.Extract({ path: EXTERN_DIR }))
    .promise();
}

function readConfigPy(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error("config.py not found");
  }

  const content = fs.readFileSync(CONFIG_PATH, "utf-8");

  const dwarfIpMatch = content.match(/DWARF_IP\s*=\s*["']([^"']+)["']/);
  const dwarfIdMatch = content.match(/DWARF_ID\s*=\s*["']([^"']+)["']/);

  return {
    DWARF_IP: dwarfIpMatch ? dwarfIpMatch[1] : undefined,
    DWARF_ID: dwarfIdMatch ? dwarfIdMatch[1] : undefined,
  };
}

// Normalize IPv4 and IPv6 localhost
const normalizeIP = (ip: string | undefined) => {
  if (!ip) return "Unknown IP";
  if (ip === "::1" || ip === "127.0.0.1") return "127.0.0.1";
  return ip;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await ensureUnzipped(); // ? Only unzips if necessary

    // ? Get client IP (Handles proxies)
    const clientIp =
      normalizeIP(
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] || // If behind a proxy
          req.socket.remoteAddress,
      ) || // Direct connection
      "Unknown IP";

    console.log(`Received request from IP: ${clientIp}`);

    const exePath =
      process.platform === "win32"
        ? path.join(EXTERN_DIR, `${EXE_NAME}.exe`)
        : `./${path.join(EXTERN_DIR, EXE_NAME)}`;

    if (!fs.existsSync(exePath)) {
      return res.status(404).json({ error: "Executable not found" });
    }

    const {
      ble_psd = "DWARF_12345678",
      ble_STA_ssid = "",
      ble_STA_pwd = "",
      auto_select = "0",
    } = req.body;

    const command_line = buildBleCommandArguments({
      blePassword: ble_psd,
      wifiSsid: ble_STA_ssid,
      wifiPassword: ble_STA_pwd,
      selectedDevice: auto_select,
    });

    console.log("run_exe_path : " + exePath);
    console.log("run_exe_instal_path : " + EXTERN_DIR);
    const childProcess = spawn(exePath, command_line, {
      cwd: EXTERN_DIR,
      shell: false,
      windowsHide: true,
    });

    let stdoutData = "";
    let stderrData = "";
    let responseSent = false;

    childProcess.on("error", (error) => {
      if (responseSent) return;
      responseSent = true;
      res
        .status(500)
        .json({ error: `Bluetooth helper failed to start: ${error.message}` });
    });

    childProcess.stdout.on("data", (data) => {
      stdoutData += data.toString().trim();
      console.log("Received:", stdoutData);
    });

    childProcess.stderr.on("data", (data) => {
      const text = data.toString().trim();
      console.info("Info:", text);
      stderrData += `${text}\n`;
    });

    childProcess.on("close", (code) => {
      if (responseSent) return;
      responseSent = true;
      if (code !== 0) {
        return res.status(500).json({ error: `Process failed: ${stderrData}` });
      }

      const jsonResult = parseBleHelperOutput(stderrData);
      console.log("Final jsonResult:", JSON.stringify(jsonResult, null, 2));

      if (jsonResult) {
        if (
          jsonResult?.step === "1" &&
          (jsonResult.dwarf_devices ?? []).length === 0
        ) {
          return res
            .status(204)
            .json({ message: "No devices found", action: "restart_scan" });
        }
        if (
          jsonResult?.step === "3" &&
          Array.isArray(jsonResult.dwarf_devices) &&
          jsonResult.dwarf_devices.length > 1
        ) {
          const deviceNames = getBleDeviceNames(jsonResult.dwarf_devices);
          return res.status(202).json({
            message: "Multiple devices found, user selection needed",
            devices: deviceNames,
          });
        }
        if (jsonResult?.step === "4") {
          if (jsonResult.is_connected) {
            return res.status(200).json({
              dwarfIp: jsonResult.ip_address,
              dwarfId: jsonResult.device_dwarf_id,
              details: jsonResult,
            });
          } else {
            return res.status(401).json({
              dwarfIp: jsonResult.ip_address,
              dwarfId: jsonResult.device_dwarf_id,
              details: jsonResult,
            });
          }
        }
        return res.status(500).json({
          error: "Unexpected error, retrying...",
          details: jsonResult,
        });
      }

      try {
        const config = readConfigPy(); // ? Read Python config file
        return res.status(200).json({
          dwarfIp: config.DWARF_IP || "",
          dwarfId: config.DWARF_ID || "",
          details: stderrData.trim(),
        });
      } catch (configError) {
        return res.status(500).json({ error: (configError as Error).message });
      }
    });

    // Keep the API request alive until the helper has produced and returned
    // its structured result. Otherwise Next.js reports a stalled response.
    await new Promise<void>((resolve) => {
      childProcess.once("close", () => resolve());
      childProcess.once("error", () => resolve());
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
