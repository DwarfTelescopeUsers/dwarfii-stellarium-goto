import type { CurrentPacket } from "dwarfii_api";

export type PreviewTypes = { tele?: number; wide?: number };
const streamType = (message: any) => {
  if (!message || typeof message !== "object") return undefined;
  const value = message.streamType ?? 0;
  return Number.isInteger(value) && value >= 0 ? value : undefined;
};

/** A present proto3 StreamType with no scalar is an authoritative zero/unknown.
 * A missing message is unknown; it cannot establish either JPEG or RTSP. */
export function reducePreviewTypes(
  previous: PreviewTypes,
  packet: CurrentPacket,
): PreviewTypes {
  if (!packet.known || packet.type === 0 || (packet.data.code ?? 0) !== 0)
    return previous;
  if (packet.cmd === 16405)
    return {
      tele: streamType(packet.data.teleCameraStateInfo?.streamType),
      wide: streamType(packet.data.wideCameraStateInfo?.streamType),
    };
  if (packet.cmd === 15234 && [2, 3].includes(packet.type)) {
    const camera = packet.data.camId ?? 0;
    if (camera !== 0 && camera !== 1) return previous;
    return {
      ...previous,
      [camera === 0 ? "tele" : "wide"]: streamType(packet.data),
    };
  }
  return previous;
}

export function previewTransport(hardwareId?: number, reportedType?: number) {
  if (hardwareId === 1) return "jpeg" as const;
  if (hardwareId !== 2 && hardwareId !== 4) return "unknown" as const;
  if (reportedType === 1) return "rtsp" as const;
  if (reportedType === 2) return "jpeg" as const;
  return "unknown" as const;
}
