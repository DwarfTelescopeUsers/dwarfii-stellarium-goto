export interface DwarfScanResult {
  step: string;
  dwarf_devices?: string[];
  dwarf_device?: string | null;
  error?: string | null;
  is_connected?: boolean;
  connecting?: boolean;
  device_dwarf_id?: number;
  device_dwarf_name?: string;
  device_dwarf_uid?: string;
  ip_address?: string;
}

export function buildBleCommandArguments({
  blePassword,
  wifiSsid,
  wifiPassword,
  selectedDevice,
}: {
  blePassword: string;
  wifiSsid: string;
  wifiPassword: string;
  selectedDevice: string | number;
}): string[] {
  return [
    "--psd",
    blePassword,
    "--ssid",
    wifiSsid,
    "--pwd",
    wifiPassword,
    "--select",
    String(selectedDevice),
    "--cmd",
  ];
}

export function parseBleHelperOutput(output: string): DwarfScanResult | null {
  let lastResult: DwarfScanResult | null = null;

  for (const line of output.split(/\r?\n/)) {
    const objectStart = line.indexOf("{");
    const objectEnd = line.lastIndexOf("}");
    if (objectStart < 0 || objectEnd <= objectStart) continue;

    const jsonText = line
      .slice(objectStart, objectEnd + 1)
      .replace(/BLEDevice\(([^)]+)\)/g, '"$1"')
      .replace(/\bNone\b/g, "null")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
      .replace(/(:\s*)'([^']*)'/g, '$1"$2"');

    try {
      lastResult = JSON.parse(jsonText) as DwarfScanResult;
    } catch {
      // The helper also writes ordinary log lines; only structured messages matter.
    }
  }

  return lastResult;
}

export function getBleDeviceNames(devices: string[] = []): string[] {
  return devices
    .map((device) => device.match(/(DWARF(?:3|_mini|II)?_[A-Za-z0-9]+)/i)?.[1])
    .filter((device): device is string => Boolean(device));
}
