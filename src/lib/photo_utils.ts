import { ConnectionContextType } from "@/types";
import type { CurrentCommand } from "dwarfii_api";
import { submitConfiguredMedia } from "@/services/dwarf/mediaConfiguration";

/** Commands report acceptance only; operation state comes from the session. */
async function submitMediaCommand(
  camera: number,
  context: ConnectionContextType,
  setMessage: Function,
  commands: readonly [CurrentCommand, CurrentCommand],
  values: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    if (camera !== 0 && camera !== 1)
      throw new Error("Select a supported camera.");
    if (!context.socketIPDwarf?.isConnected())
      throw new Error("Connect to the DWARF before using the camera.");
    setMessage("");
    await context.socketIPDwarf.request(commands[camera], values);
    setMessage("Request accepted. Waiting for camera state.");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setMessage(message);
    context.setDeviceError?.(message);
    return false;
  }
}

export async function startPhoto(
  camera: number,
  context: ConnectionContextType,
  setMessage: Function,
) {
  return submitMediaCommand(camera, context, setMessage, [
    "takeTelePhoto",
    "takeWidePhoto",
  ]);
}

export async function startVideo(
  camera: number,
  context: ConnectionContextType,
  setMessage: Function,
) {
  return submitMediaCommand(camera, context, setMessage, [
    "startTeleRecord",
    "startWideRecord",
  ]);
}

export async function stopVideo(
  camera: number,
  context: ConnectionContextType,
  setMessage: Function,
) {
  return submitMediaCommand(camera, context, setMessage, [
    "stopTeleRecord",
    "stopWideRecord",
  ]);
}

/** These legacy row/column settings have no verified current-protocol mapping. */
export const PANORAMA_UNAVAILABLE =
  "Panorama grid configuration is not supported by this connection. No panorama command was sent.";
export const TIMELAPSE_UNAVAILABLE =
  "Time-lapse interval and duration controls have not been discovered for this camera. No capture command was sent.";

function unavailable(message: string, setMessage: Function): false {
  setMessage(message);
  return false;
}

export async function startPano(
  camera: number,
  rows: number,
  cols: number,
  context: ConnectionContextType,
  setMessage: Function,
  setActiveAction?: Function,
  stopAction?: Function,
): Promise<boolean> {
  return unavailable(PANORAMA_UNAVAILABLE, setMessage);
}

export async function stopPano(
  camera: number,
  context: ConnectionContextType,
  setMessage: Function,
): Promise<boolean> {
  return unavailable(
    "Panorama stop is not supported by this connection. Use the DWARFLAB app to stop a running panorama.",
    setMessage,
  );
}

/** Count and interval are firmware values, not legacy dropdown indexes. */
export async function startBurst(
  camera: number,
  count: number,
  interval: number,
  context: ConnectionContextType,
  setMessage: Function,
  setActiveAction?: Function,
  stopAction?: Function,
): Promise<boolean> {
  return startConfigured(camera, context, setMessage, "burst", count, interval);
}

async function startConfigured(
  camera: number,
  context: ConnectionContextType,
  setMessage: Function,
  kind: "burst" | "timelapse",
  first: number,
  second: number,
): Promise<boolean> {
  try {
    setMessage("");
    await submitConfiguredMedia(camera, context, kind, first, second);
    setMessage("Request accepted. Waiting for camera state.");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setMessage(message);
    context.setDeviceError?.(message);
    return false;
  }
}

export async function stopBurst(
  camera: number,
  context: ConnectionContextType,
  setMessage: Function,
): Promise<boolean> {
  return submitMediaCommand(camera, context, setMessage, [
    "stopTeleBurst",
    "stopWideBurst",
  ]);
}

export async function startTimeLapse(
  camera: number,
  intervalIndex: number,
  totalTimeIndex: number,
  context: ConnectionContextType,
  setMessage: Function,
  setActiveAction?: Function,
  stopAction?: Function,
): Promise<boolean> {
  return startConfigured(
    camera,
    context,
    setMessage,
    "timelapse",
    intervalIndex,
    totalTimeIndex,
  );
}

/** A running time-lapse can still be stopped using the canonical empty request. */
export async function stopTimeLapse(
  camera: number,
  context: ConnectionContextType,
  setMessage: Function,
): Promise<boolean> {
  return submitMediaCommand(camera, context, setMessage, [
    "stopTeleTimelapse",
    "stopWideTimelapse",
  ]);
}
