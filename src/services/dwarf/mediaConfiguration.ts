import type { ConnectionContextType } from "@/types";
import {
  decodeCurrentParamId,
  selectCurrentParameterValue,
  type CurrentCommand,
} from "dwarfii_api";
import {
  loadV3CameraParameterCatalog,
  getV3NormalizedCameraCatalog,
} from "./cameraParams";

const configuring = new WeakSet<object>();

/** Explicit user media capture; firmware-discovered values, never UI ordinals.
 * APK ShootingModeType.NORMAL=1; ShootingTech.BURST=3/TIMELAPSE=5.
 */
export async function submitConfiguredMedia(
  cameraId: number,
  context: ConnectionContextType,
  kind: "burst" | "timelapse",
  first: number,
  second: number,
): Promise<void> {
  const socket = context.socketIPDwarf;
  const ip = context.IPDwarf;
  if ((cameraId !== 0 && cameraId !== 1) || !socket?.isConnected() || !ip)
    throw new Error(
      "Connect to the DWARF and select a supported camera first.",
    );
  if (configuring.has(socket))
    throw new Error("A media capture request is already being configured.");
  if (
    ![first, second].every(
      (value) =>
        Number.isSafeInteger(value) && value >= 0 && value <= 2147483647,
    )
  )
    throw new Error("Select supported whole-number media settings.");
  const generation = socket.session?.state.generation;
  const sameSession = () => {
    if (
      context.socketIPDwarf !== socket ||
      context.IPDwarf !== ip ||
      socket.session?.state.generation !== generation ||
      !socket.isConnected()
    )
      throw new Error(
        "The DWARF connection changed while configuring capture. Review settings and retry.",
      );
  };
  const request = async (
    operation: CurrentCommand,
    values: Record<string, unknown>,
  ) => {
    sameSession();
    const packet = await socket.request(operation, values);
    sameSession();
    return packet;
  };
  configuring.add(socket);
  try {
    await loadV3CameraParameterCatalog(ip, context, 1);
    sameSession();
    const catalog = getV3NormalizedCameraCatalog(1, context);
    if (!catalog?.cameras.some((camera) => camera.cameraId === cameraId))
      throw new Error("This camera did not advertise photo-mode capabilities.");
    const controls: readonly (readonly [string, number, number])[] =
      kind === "burst"
        ? ([
            ["burstCount", 21, first],
            ["burstIntervalTime", 22, second],
          ] as const)
        : ([
            ["timelapseIntervalTime", 25, first],
            ["timelapseTotalTime", 26, second],
          ] as const);
    const parameters = controls.map(([key, index, value]) => {
      const matches =
        catalog.sharedParameters?.filter(
          (parameter) => parameter.key === key,
        ) ?? [];
      if (matches.length !== 1 || !matches[0].paramId)
        throw new Error(
          `The connected DWARF did not advertise a unique ${key} control.`,
        );
      const parameter = matches[0];
      const namespace = decodeCurrentParamId(parameter.paramId);
      if (
        namespace.shootingMode !== 1 ||
        namespace.category !== 2 ||
        namespace.cameraId !== 15 ||
        namespace.paramIndex !== index
      )
        throw new Error(
          `The discovered ${key} identifier belongs to a different control.`,
        );
      return selectCurrentParameterValue(parameter, value);
    });
    // Configuration has been validated before any camera/mode/parameter writes.
    const snapshot = socket.session?.state.snapshot;
    for (const key of ["teleCameraStateInfo", "wideCameraStateInfo"]) {
      if (
        Object.values(snapshot?.[key]?.exclusiveState ?? {}).some(
          (state: any) =>
            state &&
            typeof state === "object" &&
            [1, 2].includes(state.state ?? -1),
        )
      )
        throw new Error(
          "Wait for the active camera operation to stop before changing capture mode.",
        );
    }
    const mode = await request("switchShootingMode", { mode: 1 });
    if (mode.data.shootingModeId !== 1)
      throw new Error("DWARF did not confirm normal camera mode.");
    const camera = await request("enterCamera", {
      clientParam: { encodeType: 1 },
    });
    if (camera.data.shootingModeId !== 1)
      throw new Error("DWARF did not confirm the normal camera.");
    const techId = kind === "burst" ? 3 : 5;
    const tech = await request("switchShootingTech", { tech: techId });
    if (tech.data.shootingTechId !== techId)
      throw new Error("DWARF did not confirm the selected capture technique.");
    for (const values of parameters)
      await request("setIntegerParameter", values);
    await request(
      kind === "burst"
        ? cameraId === 0
          ? "startTeleBurst"
          : "startWideBurst"
        : cameraId === 0
          ? "startTeleTimelapse"
          : "startWideTimelapse",
      kind === "burst" ? { count: first } : {},
    );
  } finally {
    configuring.delete(socket);
  }
}
