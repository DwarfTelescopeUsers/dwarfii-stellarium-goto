import type { CurrentPacket } from "dwarfii_api";

export type SessionPreviewProgress = {
  frames?: number;
  stackedFrames?: number;
  targetName?: string;
};

export const initialSessionPreview: SessionPreviewProgress = {};

/** Capture counters belong to a camera, never to the last fleet notification. */
export function reduceSessionPreview(
  previous: SessionPreviewProgress,
  packet: CurrentPacket,
  cameraId: 0 | 1,
): SessionPreviewProgress {
  if (!packet.known || ![2, 3].includes(packet.type)) return previous;
  const expected = cameraId === 0 ? [15209, 15263] : [15237];
  if (!expected.includes(packet.cmd) || (packet.data.code ?? 0) !== 0)
    return previous;
  const data = packet.data;
  if (data.cameraType !== undefined && data.cameraType !== cameraId)
    return previous;
  // Firmware sends independent capture (0) and stack (1) updates. Proto3
  // omits their unrelated counters; a stack packet must not erase capture.
  // Update 2 marks a fresh capture sequence.
  const updateType = data.updateType ?? 0;
  const frames =
    updateType === 2
      ? 0
      : (data.currentCount ?? (updateType === 0 ? 0 : (previous.frames ?? 0)));
  const stackedFrames =
    updateType === 2
      ? 0
      : (data.stackedCount ??
        (updateType === 1 ? 0 : (previous.stackedFrames ?? 0)));
  if (
    !Number.isInteger(frames) ||
    frames < 0 ||
    !Number.isInteger(stackedFrames) ||
    stackedFrames < 0
  )
    return previous;
  return {
    frames,
    stackedFrames,
    targetName:
      typeof data.targetName === "string"
        ? data.targetName
        : previous.targetName,
  };
}
