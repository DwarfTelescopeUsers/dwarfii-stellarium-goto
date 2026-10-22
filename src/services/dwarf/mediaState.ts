import type { CurrentPacket, CurrentSessionState } from "dwarfii_api";

export type MediaState = {
  operation: "photo" | "video" | "burst" | "timelapse" | "panorama";
  cameraId: 0 | 1;
  state: "idle" | "running" | "stopping" | "stopped";
};

const mediaOperations: Partial<Record<number, MediaState["operation"]>> = {
  15273: "photo",
  15274: "burst",
  15275: "video",
  15276: "timelapse",
  15277: "panorama",
};

/** Canonical notify.proto PhotoState/RecordState; never infer state from ACK. */
export function decodeMediaState(
  packet?: Pick<CurrentPacket, "type" | "cmd" | "data">,
): MediaState | undefined {
  if (
    !packet ||
    ![2, 3].includes(packet.type) ||
    ![15273, 15274, 15275, 15276, 15277].includes(packet.cmd)
  )
    return;
  const operation = mediaOperations[packet.cmd];
  if (!operation) return;
  const cameraId = packet.data.cameraType ?? 0;
  const state = packet.data.state ?? 0;
  if (
    (cameraId !== 0 && cameraId !== 1) ||
    !Number.isInteger(state) ||
    state < 0 ||
    state > 3
  )
    return;
  return {
    operation,
    cameraId,
    state: (["idle", "running", "stopping", "stopped"] as const)[state],
  };
}

/** Rehydrate an already running camera from the full state snapshot. */
export function snapshotMediaStates(state: CurrentSessionState): MediaState[] {
  if (state.phase !== "ready" || !state.snapshot) return [];
  const result: MediaState[] = [];
  for (const cameraId of [0, 1] as const) {
    const camera =
      state.snapshot[
        cameraId === 0 ? "teleCameraStateInfo" : "wideCameraStateInfo"
      ];
    for (const [key, cmd] of [
      ["photoState", 15273],
      ["recordState", 15275],
      ["burstState", 15274],
      ["timelapseState", 15276],
      ["panoramaState", 15277],
    ] as const) {
      const value = camera?.exclusiveState?.[key];
      if (!value) continue;
      const decoded = decodeMediaState({
        type: 2,
        cmd,
        data: { ...value, cameraType: cameraId },
      });
      if (decoded) result.push(decoded);
    }
  }
  return result;
}
