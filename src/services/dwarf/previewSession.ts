import type { ConnectionContextType } from "@/types";
import { acquireCaptureOwnership, assertCameraIdle } from "./captureOwnership";

/** A page's preview request ends with that page and that connection generation.
 * The Fleet transport may intentionally remain connected after navigation. */
export async function openDevicePreview(
  context: ConnectionContextType,
  cameras: readonly (0 | 1)[],
  signal: AbortSignal,
  returnToLive = false,
) {
  const socket = context.socketIPDwarf;
  const host = context.IPDwarf;
  const generation = socket?.session?.state.generation;
  const check = () => {
    if (
      signal.aborted ||
      context.socketIPDwarf !== socket ||
      context.IPDwarf !== host ||
      (host !== undefined &&
        socket?.IPDwarf !== undefined &&
        socket.IPDwarf !== host) ||
      !socket?.isConnected() ||
      socket.session?.state.generation !== generation ||
      socket.session?.state.ownership !== "control"
    )
      throw new Error(
        "Preview connection or page changed. Open the selected device again.",
      );
  };
  const client = socket?.currentClient;
  const release =
    returnToLive && client ? acquireCaptureOwnership(client) : () => {};
  try {
    check();
    if (returnToLive) {
      const snapshot = await socket!.request("getDeviceState");
      check();
      for (const camera of cameras) assertCameraIdle(snapshot.data, camera);
      for (const camera of cameras) {
        check();
        await socket!.request(camera === 0 ? "goLiveTele" : "goLiveWide");
      }
    }
    check();
    await socket!.request("enterCamera", { clientParam: { encodeType: 1 } });
    for (const camera of cameras) {
      check();
      await socket!.request(
        camera === 0 ? "telePreviewQuality" : "widePreviewQuality",
        { level: 1 },
      );
    }
    check();
    if (returnToLive) await socket!.request("getDeviceState");
    check();
  } finally {
    release();
  }
}
