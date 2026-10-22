export const LAST_BLE_DEVICE_KEY = "dwarfium.lastBleDevice";

export type LastBleDevice = { name: string; host: string; savedAt: number };

export function bleNameFromResult(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const details = result as {
    dwarf_device?: unknown;
    device_dwarf_uid?: unknown;
    device_dwarf_id?: unknown;
  };
  const advertised =
    typeof details.dwarf_device === "string"
      ? details.dwarf_device.match(/DWARF(?:3|_mini|II)?_[A-Za-z0-9]+/i)?.[0]
      : undefined;
  if (advertised) return advertised;
  if (typeof details.device_dwarf_uid !== "string") return undefined;
  const uid = details.device_dwarf_uid.trim();
  if (!/^(?:mini_)?[A-Za-z0-9]+$/.test(uid)) return undefined;
  if (uid.startsWith("mini_")) return `DWARF_${uid}`;
  return details.device_dwarf_id === 1 ? `DWARF_${uid}` : `DWARF3_${uid}`;
}

export function rememberBleDevice(name: string, host: string): void {
  localStorage.setItem(
    LAST_BLE_DEVICE_KEY,
    JSON.stringify({ name, host, savedAt: Date.now() }),
  );
}

export function lastBleDevice(): LastBleDevice | undefined {
  try {
    const value = JSON.parse(
      localStorage.getItem(LAST_BLE_DEVICE_KEY) || "null",
    );
    return typeof value?.name === "string" &&
      typeof value?.host === "string" &&
      typeof value?.savedAt === "number" &&
      Date.now() - value.savedAt < 15 * 60 * 1000
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}
