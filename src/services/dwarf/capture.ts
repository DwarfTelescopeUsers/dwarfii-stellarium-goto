import { getCurrentProfile, findCurrentCameraParameter } from "dwarfii_api";
import type { ConnectionContextType } from "@/types";
import { resolveCurrentCameraGainValue } from "@/lib/dwarf_utils";
import {
  loadV3AstroParameterCatalog,
  getV3NormalizedCameraCatalog,
  resolveScienceFilterIndex,
} from "./cameraParams";
import { executeCurrentCaptureWithRuntime } from "./captureRuntime";

/** Translate the existing settings form at one boundary. The SDK validates all
 * runtime capabilities and submits the verified sequence; ACK is not completion.
 */
const pendingCaptures = new WeakSet<object>();

export async function startCurrentAstroCapture(context: ConnectionContextType) {
  const socket = context.socketIPDwarf;
  if (!socket?.isConnected())
    throw new Error("Connect to the DWARF before starting a capture.");
  if (pendingCaptures.has(socket))
    throw new Error(
      "A capture request is already in progress. Wait for its result.",
    );
  pendingCaptures.add(socket);
  try {
    return await submitCurrentAstroCapture(context);
  } finally {
    pendingCaptures.delete(socket);
  }
}

async function submitCurrentAstroCapture(context: ConnectionContextType) {
  const socket = context.socketIPDwarf;
  const hardwareId = context.typeIdDwarf;
  if (hardwareId === undefined)
    throw new Error("The connected DWARF model has not been identified.");
  if (!socket?.isConnected() || !context.IPDwarf)
    throw new Error("Connect to the DWARF before starting a capture.");
  const generation = socket.session?.state.generation;
  await loadV3AstroParameterCatalog(context.IPDwarf, context);
  if (
    context.socketIPDwarf !== socket ||
    socket.session?.state.generation !== generation ||
    !socket.isConnected()
  )
    throw new Error(
      "The DWARF reconnected while loading capture settings. Retry the request.",
    );
  const catalog = getV3NormalizedCameraCatalog(2, context);
  if (!catalog)
    throw new Error(
      "Camera capabilities are not available. Reconnect and retry.",
    );
  const cameraId: 0 | 1 = context.currentAstroCamera === 1 ? 1 : 0;
  const exposure = findCurrentCameraParameter(catalog, cameraId, "exp");
  const selectedExposure =
    cameraId === 0
      ? context.astroSettings.exposure
      : context.astroSettings.wideExposure;
  const choice = exposure?.options?.find(
    (option) => option.value === selectedExposure,
  );
  if (!choice?.seconds)
    throw new Error("Select an exposure supported by the connected camera.");
  const selectedGain =
    cameraId === 0
      ? context.astroSettings.gain
      : context.astroSettings.wideGain;
  const gain = resolveCurrentCameraGainValue(
    context,
    cameraId,
    Number(selectedGain),
  );
  // Pass the session generation through the SDK capture transaction guard.
  const transport = {
    get state() {
      return {
        session: { generation: socket.session?.state.generation ?? -1 },
      };
    },
    request: (operation, values) => {
      if (socket.session?.state.generation !== generation)
        throw new Error(
          "The DWARF reconnected. Review settings before retrying capture.",
        );
      return socket.request(operation, values);
    },
  };
  const client = socket.currentClient;
  if (!client)
    throw new Error(
      "The DWARF connection changed. Reconnect before capturing.",
    );
  return executeCurrentCaptureWithRuntime(
    client,
    transport,
    getCurrentProfile(hardwareId),
    catalog,
    {
      cameraId,
      exposureSeconds: choice.seconds,
      gain,
      frameCount: Number(context.astroSettings.count),
      ...(cameraId === 0
        ? {
            filterIndex: resolveScienceFilterIndex(
              hardwareId,
              Number(context.astroSettings.IR),
            ),
          }
        : {}),
    },
    async () => {
      await loadV3AstroParameterCatalog(context.IPDwarf!, context);
      const current = getV3NormalizedCameraCatalog(2, context);
      if (!current)
        throw new Error("Camera capabilities are no longer available.");
      return current;
    },
  );
}
