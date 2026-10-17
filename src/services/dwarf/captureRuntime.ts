import {
  assertCurrentSuccess,
  executeCurrentCapture,
  currentCaptureControlsForObservedMode,
  decodeCurrentParamId,
  findCurrentCameraParameter,
  resolveCurrentCaptureControls,
  type CurrentCameraCatalog,
  type CurrentCaptureSettings,
  type CurrentCaptureTransport,
  type CurrentPacket,
  type CurrentProfile,
  type CurrentWebSocketHandler,
} from "dwarfii_api";
import { acquireCaptureOwnership, assertCameraIdle } from "./captureOwnership";

/** Mini firmware accepts manual mode-2 exposure/gain writes, but a subsequent
 * 11041 quick-set makes those writes fail with -1 and can reload stale capture
 * values. Its 16703 count echo also does not change the 11005 job's 30-frame
 * target, so stop on actual 15209 frame progress rather than trusting the ACK.
 */
async function executeRuntimeCapture(
  client: CurrentWebSocketHandler,
  transport: CurrentCaptureTransport,
  profile: CurrentProfile,
  catalog: CurrentCameraCatalog,
  settings: CurrentCaptureSettings,
  readCurrent: () => Promise<CurrentCameraCatalog>,
) {
  const controls = resolveCurrentCaptureControls(profile, catalog, settings);
  const generation = client.session.state.generation;
  let transactionActive = true;
  const send = async (
    operation: Parameters<CurrentCaptureTransport["request"]>[0],
    values: Record<string, unknown>,
  ) => {
    if (!transactionActive || client.session.state.generation !== generation)
      throw new Error(
        "Capture connection changed; review the telescope before retrying.",
      );
    const packet = await transport.request(operation, values);
    if (!transactionActive || client.session.state.generation !== generation)
      throw new Error(
        "Capture connection changed while waiting for a response.",
      );
    assertCurrentSuccess(packet);
    return packet;
  };
  const snapshot = await send("getDeviceState", {});
  assertCameraIdle(snapshot.data, settings.cameraId);
  if (profile.model === "dwarfmini") {
    const mode = await send("switchShootingMode", { mode: 8 });
    if (mode.data.shootingModeId !== 8)
      throw new Error("Mini did not confirm astronomy shooting mode.");
    const camera = await send("enterCamera", {
      clientParam: { encodeType: 1 },
    });
    if (![2, 8].includes(camera.data.shootingModeId ?? -1))
      throw new Error("Mini did not confirm the astronomy camera.");
    const tech = await send("switchShootingTech", { tech: 2 });
    if (tech.data.shootingTechId !== 2)
      throw new Error("Mini did not confirm deep-sky stacking mode.");
    const current = await readCurrent();
    const exposure = findCurrentCameraParameter(
      current,
      settings.cameraId,
      "exp",
    );
    const gain = findCurrentCameraParameter(current, settings.cameraId, "gain");
    if (Number(exposure.currentValue) !== controls.exposure.value)
      await send("setExposure", controls.exposure);
    if (Number(gain.currentValue) !== controls.gain.value)
      await send("setGain", controls.gain);
    await send("setIntegerParameter", controls.frameCount);
    const verified = await readCurrent();
    const verifiedExposure = findCurrentCameraParameter(
      verified,
      settings.cameraId,
      "exp",
    );
    const verifiedGain = findCurrentCameraParameter(
      verified,
      settings.cameraId,
      "gain",
    );
    const verifiedCount = findCurrentCameraParameter(
      verified,
      settings.cameraId,
      "stackCount",
    );
    if (
      Number(verifiedExposure.currentValue) !== controls.exposure.value ||
      Number(verifiedGain.currentValue) !== controls.gain.value ||
      Number(verifiedCount.currentValue) !== settings.frameCount
    )
      throw new Error(
        "Mini did not apply the requested astronomy settings; capture was not started.",
      );
  }

  let count = 0;
  let captureStarted = false;
  let startRequested = false;
  let progressSession = false;
  let stopRequested = false;
  let stopFailure: Error | undefined;
  const observedModes = new Set<number>();
  let reapplying = 0;
  let reapplyQueue = Promise.resolve();
  let settled = false;
  let finish!: (error?: Error) => void;
  const completed = new Promise<void>((resolve, reject) => {
    finish = (error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };
  });
  // The subscription may reject before the start command resolves.
  void completed.catch(() => undefined);
  const requestStop = (error?: Error) => {
    if (stopRequested || settled || !transactionActive) return;
    stopRequested = true;
    stopFailure = error;
    void transport
      .request(
        settings.cameraId === 0 ? "stopTeleCapture" : "stopWideCapture",
        {},
      )
      // A stop ACK only acknowledges the request. Keep this capture locked
      // until the matching idle/stopped lifecycle notification arrives.
      .then(() => undefined)
      .catch((failure) =>
        finish(
          error ??
            (failure instanceof Error ? failure : new Error(String(failure))),
        ),
      );
  };
  const unsubscribe = client.subscribe((state, packet?: CurrentPacket) => {
    if (
      state.session.generation !== generation ||
      state.session.phase !== "ready" ||
      (state.session.ownership !== undefined &&
        state.session.ownership !== "control")
    ) {
      finish(
        new Error(
          "Mini connection changed during capture; check the telescope before retrying.",
        ),
      );
      return;
    }
    if (
      !packet ||
      ![2, 3].includes(packet.type) ||
      (packet.data.code ?? 0) !== 0
    )
      return;
    if (
      !settled &&
      !stopRequested &&
      startRequested &&
      packet.cmd === 15264 &&
      packet.moduleId === 15 &&
      packet.data.paramId !== undefined
    ) {
      const parts = decodeCurrentParamId(packet.data.paramId);
      if (
        parts.cameraId === settings.cameraId &&
        [11, 13].includes(parts.shootingMode) &&
        !observedModes.has(parts.shootingMode)
      ) {
        observedModes.add(parts.shootingMode);
        reapplying++;
        const active = currentCaptureControlsForObservedMode(
          controls,
          parts.shootingMode,
        );
        reapplyQueue = reapplyQueue
          .then(async () => {
            for (const [operation, values] of [
              ["setExposure", active.exposure],
              ["setGain", active.gain],
              ["setIntegerParameter", active.frameCount],
            ] as const) {
              if (!transactionActive || settled || stopRequested) return;
              await send(operation, values);
            }
          })
          .catch((error) => {
            if (transactionActive && !settled && !stopRequested)
              requestStop(
                error instanceof Error ? error : new Error(String(error)),
              );
          })
          .finally(() => {
            reapplying--;
          });
      }
    }
    if (packet.cmd === (settings.cameraId === 0 ? 15208 : 15236)) {
      if (!startRequested) {
        if (packet.data.state === 1)
          finish(
            new Error(
              "Another capture began while configuring this device. Check telescope state before retrying.",
            ),
          );
        return;
      }
      if (packet.data.state === 1) captureStarted = true;
      if (
        (captureStarted || stopRequested) &&
        [0, 3].includes(packet.data.state ?? 0) &&
        !settled
      )
        finish(
          stopFailure ??
            (progressSession && count >= settings.frameCount
              ? undefined
              : new Error(
                  "Mini capture stopped before the requested frame count.",
                )),
        );
    }
    if (!captureStarted) return;
    if (
      packet.cmd === (settings.cameraId === 0 ? 15209 : 15237) &&
      packet.data.updateType === 2
    ) {
      progressSession = true;
      count = 0;
    }
    if (!progressSession) return;
    if (
      packet.cmd === 15288 &&
      packet.data.totalTime !== undefined &&
      Number(packet.data.totalTime) !== settings.exposureSeconds &&
      !reapplying
    )
      requestStop(
        new Error(
          "Mini started a different exposure duration; capture stopped.",
        ),
      );
    if (packet.cmd === (settings.cameraId === 0 ? 15209 : 15237)) {
      if (
        packet.data.expIndex !== undefined &&
        Number(packet.data.expIndex) !== controls.exposure.value &&
        !reapplying
      )
        requestStop(
          new Error(
            "Mini started a different exposure setting; capture stopped.",
          ),
        );
      if (packet.data.currentCount !== undefined)
        count = Math.max(count, Number(packet.data.currentCount));
      if (count >= settings.frameCount) requestStop();
    }
  });
  const timer = setTimeout(
    () => {
      const error = new Error(
        "Mini capture did not reach confirmed idle state in time. Check the telescope before retrying.",
      );
      requestStop(error);
      finish(error);
    },
    Math.max(
      120_000,
      settings.frameCount * (settings.exposureSeconds + 8) * 1000 + 90_000,
    ),
  );
  try {
    try {
      if (profile.model === "dwarfmini") {
        startRequested = true;
        await send(
          settings.cameraId === 0 ? "startTeleCapture" : "startWideCapture",
          settings.cameraId === 0 ? { irIndex: settings.filterIndex } : {},
        );
      } else
        await executeCurrentCapture(
          {
            get state() {
              return transport.state;
            },
            request: (operation, values) => {
              if (settled || stopRequested || !transactionActive)
                throw new Error(
                  "Capture configuration was interrupted before starting.",
                );
              if (
                operation === "startTeleCapture" ||
                operation === "startWideCapture"
              )
                startRequested = true;
              return transport.request(operation, values);
            },
          },
          profile,
          catalog,
          settings,
        );
    } catch (error) {
      // Firmware may send a delayed preparation warning after it has already
      // entered shooting. Only actual lifecycle evidence makes it nonfatal.
      if ((error as { code?: number })?.code !== -11514 || !captureStarted)
        throw error;
    }
    await completed;
    return { status: "completed" as const, frames: count };
  } catch (error) {
    if (!settled)
      requestStop(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    transactionActive = false;
    clearTimeout(timer);
    unsubscribe();
  }
}

/** All models finish from device lifecycle, not ACK. D2/D3 retain the SDK's
 * quick-set preparation; Mini uses its readback-verified manual settings. */
export async function executeCurrentCaptureWithRuntime(
  client: CurrentWebSocketHandler,
  transport: CurrentCaptureTransport,
  profile: CurrentProfile,
  catalog: CurrentCameraCatalog,
  settings: CurrentCaptureSettings,
  readCurrent: () => Promise<CurrentCameraCatalog>,
) {
  const release = acquireCaptureOwnership(client);
  try {
    return await executeRuntimeCapture(
      client,
      transport,
      profile,
      catalog,
      settings,
      readCurrent,
    );
  } finally {
    release();
  }
}
