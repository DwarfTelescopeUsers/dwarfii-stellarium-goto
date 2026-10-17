import {
  assertCurrentSuccess,
  decodeCurrentParamId,
  findCurrentCameraParameter,
  getCurrentProfile,
  resolveCurrentScienceFilter,
  selectCurrentExposure,
  selectCurrentParameterValue,
  withCurrentParamMode,
  type CurrentCommand,
  type CurrentPacket,
} from "dwarfii_api";
import type { ConnectionContextType } from "@/types";
import {
  loadV3AstroParameterCatalog,
  getV3NormalizedCameraCatalog,
} from "./cameraParams";
import { acquireCaptureOwnership, assertCameraIdle } from "./captureOwnership";

export type NativeMosaicSettings = {
  horizontalScale: number;
  verticalScale: number;
  exposureSeconds: number;
  gain: number;
  count: number;
  filterIndex: number;
};
export type NativeMosaicProgress = {
  phase:
    "preparing" | "submitted" | "running" | "stopping" | "stopped" | "unknown";
  currentCount?: number;
  stackedCount?: number;
  fovId?: number;
  fovTotal?: number;
};
const activeMosaics = new WeakSet<object>();

/** Direct native 11031 mosaic. Its scale factors are firmware FoV multiples,
 * not the portable planner's independent RA/Dec panel grid. No movement/GOTO
 * is manufactured here; the observer must center and align the target first.
 */
export async function startCurrentMosaic(
  context: ConnectionContextType,
  settings: NativeMosaicSettings,
  report: (progress: NativeMosaicProgress) => void,
) {
  const socket = context.socketIPDwarf;
  const client = socket?.currentClient;
  const host = context.IPDwarf;
  const model = context.typeIdDwarf;
  if (!socket?.isConnected() || !client || !host || model === undefined)
    throw new Error("Connect to a DWARF before starting a mosaic.");
  if (activeMosaics.has(socket))
    throw new Error("A native mosaic is already pending on this connection.");
  if (
    ![settings.horizontalScale, settings.verticalScale].every(
      (scale) =>
        Number.isInteger(scale) &&
        scale >= 100 &&
        scale <= 180 &&
        scale % 10 === 0,
    )
  )
    throw new Error(
      "Choose native mosaic scales from 1.0× to 1.8× in 0.1 steps.",
    );
  if (settings.horizontalScale === 100 && settings.verticalScale === 100)
    throw new Error("Increase at least one scale above 1.0× for a mosaic.");
  const generation = client.session.state.generation;
  let live = true;
  let stopRequested = false;
  let started = false;
  let finished = false;
  let stopFailure: Error | undefined;
  const check = () => {
    if (
      !live ||
      context.socketIPDwarf !== socket ||
      context.IPDwarf !== host ||
      socket.currentClient !== client ||
      !socket.isConnected() ||
      client.session.state.generation !== generation ||
      client.session.state.ownership !== "control"
    )
      throw new Error(
        "Mosaic connection or control changed. Check the original device before retrying.",
      );
  };
  const send = async (
    operation: CurrentCommand,
    values: Record<string, unknown> = {},
  ) => {
    check();
    const packet = await socket.request(operation, values);
    check();
    assertCurrentSuccess(packet);
    return packet as CurrentPacket;
  };
  check();
  resolveCurrentScienceFilter(getCurrentProfile(model), settings.filterIndex);
  const release = acquireCaptureOwnership(client);
  activeMosaics.add(socket);
  let unsubscribe = () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finish!: (error?: Error) => void;
  let requestStop: ((error?: Error) => void) | undefined;
  let startSent = false;
  const completed = new Promise<void>((resolve, reject) => {
    finish = (error) => {
      if (finished) return;
      finished = true;
      error ? reject(error) : resolve();
    };
  });
  void completed.catch(() => undefined);
  try {
    report({ phase: "preparing" });
    const state = await send("getDeviceState");
    assertCameraIdle(state.data, 0);
    await loadV3AstroParameterCatalog(host, context);
    check();
    const catalog = getV3NormalizedCameraCatalog(2, context);
    if (!catalog) throw new Error("Live camera parameters are unavailable.");
    const exposure = selectCurrentExposure(
      catalog,
      0,
      settings.exposureSeconds,
    );
    const gain = findCurrentCameraParameter(catalog, 0, "gain");
    selectCurrentParameterValue(gain, settings.gain);
    const count = findCurrentCameraParameter(catalog, 0, "mosaicCount");
    const countParts = decodeCurrentParamId(count.paramId);
    if (
      countParts.cameraId !== 0 ||
      countParts.category !== 2 ||
      countParts.paramIndex !== 17
    )
      throw new Error(
        "This firmware did not advertise a native telephoto mosaic count control.",
      );
    selectCurrentParameterValue(count, settings.count);
    const controls = [
      [
        "setExposure",
        { paramId: exposure.paramId, mode: 1, value: exposure.value },
      ],
      ["setGain", { paramId: gain.paramId, mode: 1, value: settings.gain }],
      [
        "setIntegerParameter",
        { paramId: count.paramId, value: settings.count },
      ],
    ] as const;
    const mode = await send("switchShootingMode", { mode: 8 });
    if (mode.data.shootingModeId !== 8)
      throw new Error("The device did not confirm astronomy mode.");
    const camera = await send("enterCamera", {
      clientParam: { encodeType: 1 },
    });
    if (![2, 8].includes(camera.data.shootingModeId))
      throw new Error("The device did not confirm the astronomy camera.");
    const tech = await send("switchShootingTech", { tech: 2 });
    if (tech.data.shootingTechId !== 2)
      throw new Error("The device did not confirm deep-sky capture.");
    for (const [operation, values] of controls) await send(operation, values);
    await loadV3AstroParameterCatalog(host, context);
    check();
    const verified = getV3NormalizedCameraCatalog(2, context);
    if (
      !verified ||
      [
        ["exp", exposure.value],
        ["gain", settings.gain],
        ["mosaicCount", settings.count],
      ].some(
        ([key, value]) =>
          Number(
            findCurrentCameraParameter(verified, 0, String(key)).currentValue,
          ) !== value,
      )
    )
      throw new Error(
        "Mosaic settings were not confirmed by the device. Nothing was started.",
      );
    const stop = (error?: Error) => {
      if (stopRequested || finished || !live) return;
      stopRequested = true;
      stopFailure = error;
      report({ phase: "stopping" });
      void send("stopTeleCapture").catch((failure) =>
        finish(failure instanceof Error ? failure : new Error(String(failure))),
      );
    };
    requestStop = stop;
    let reapplies = Promise.resolve();
    const modes = new Set<number>();
    unsubscribe = client.subscribe((state, packet?: CurrentPacket) => {
      try {
        check();
      } catch (error) {
        finish(error as Error);
        return;
      }
      if (
        !packet?.known ||
        ![2, 3].includes(packet.type) ||
        (packet.data.code ?? 0) !== 0 ||
        finished
      )
        return;
      if (
        packet.cmd === 15264 &&
        packet.moduleId === 15 &&
        packet.data.paramId !== undefined &&
        !stopRequested
      ) {
        const parts = decodeCurrentParamId(packet.data.paramId);
        if (
          parts.cameraId === 0 &&
          [11, 13].includes(parts.shootingMode) &&
          !modes.has(parts.shootingMode)
        ) {
          modes.add(parts.shootingMode);
          reapplies = reapplies
            .then(async () => {
              for (const [operation, values] of controls) {
                if (!live || finished || stopRequested) return;
                await send(operation, {
                  ...values,
                  paramId: withCurrentParamMode(
                    values.paramId,
                    parts.shootingMode,
                  ),
                });
              }
            })
            .catch((error) => {
              if (live && !finished) stop(error);
            });
        }
      }
      if (packet.cmd === 15208) {
        const captureState = packet.data.state ?? 0;
        if (captureState === 1) {
          started = true;
          report({ phase: "running" });
        } else if (captureState === 2) report({ phase: "stopping" });
        else if ((started || stopRequested) && [0, 3].includes(captureState)) {
          report({ phase: "stopped" });
          finish(stopFailure);
        }
      }
      if (packet.cmd === 15263) {
        started = true;
        report({
          phase: "running",
          currentCount: packet.data.currentCount,
          stackedCount: packet.data.stackedCount,
          fovId: packet.data.fovId,
          fovTotal: packet.data.fovTotal,
        });
      }
    });
    timer = setTimeout(
      () => {
        const error = new Error(
          "No confirmed mosaic terminal state. Check this telescope before retrying.",
        );
        stop(error);
        finish(error);
      },
      Math.max(
        180_000,
        settings.count * (settings.exposureSeconds + 10) * 1000 * 16 + 120_000,
      ),
    );
    startSent = true;
    let ack: CurrentPacket | undefined;
    try {
      ack = await send("startTeleMosaic", {
        horizontalScale: settings.horizontalScale,
        verticalScale: settings.verticalScale,
        rotation: -1,
        irIndex: settings.filterIndex,
        forceStart: false,
      });
    } catch (error) {
      if ((error as { code?: number })?.code !== -11514 || !started)
        throw error;
    }
    if (!started) report({ phase: "submitted" });
    return { acknowledgement: ack, completed, stop: () => stop() };
  } catch (error) {
    const reason = error instanceof Error ? error : new Error(String(error));
    // A rejected/timed-out start can still have begun shooting. Keep the
    // original connection's listener/lock until stop is independently observed.
    if (startSent && requestStop) requestStop(reason);
    else finish(reason);
    throw error;
  } finally {
    // Ownership survives the start ACK and is released only on terminal state.
    void completed
      .finally(() => {
        live = false;
        clearTimeout(timer);
        unsubscribe();
        activeMosaics.delete(socket);
        release();
      })
      .catch(() => undefined);
  }
}
