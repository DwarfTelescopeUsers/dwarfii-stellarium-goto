/* eslint-disable no-unused-vars */
/**
 * The sole application boundary for the telescope protocol. UI code must import
 * from here rather than binding itself to the generated API package.
 */
export * from "dwarfii_api";

import {
  createPacket,
  Dwarfii_Api,
  setDwarfClientID,
  setDwarfDeviceID,
  setDwarfMinorVersion,
} from "dwarfii_api";
import type { DwarfDeviceProfile } from "./deviceProfile";
import { WebSocketHandler, configureCurrentConnection } from "./connection";
export { WebSocketHandler } from "./connection";

export type DwarfSocket = {
  setDeviceIdDwarf(deviceId: number): boolean;
  setMinorVersionDwarf(minorVersion: number): boolean;
};

export class DwarfProtocolError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DwarfProtocolError";
  }
}

export function configureDwarfProtocol(
  socket: WebSocketHandler,
  profile: DwarfDeviceProfile,
): void {
  configureCurrentConnection(socket, profile.deviceId);
  const configured =
    setDwarfClientID(profile.clientId) &&
    setDwarfDeviceID(profile.wireDeviceId) &&
    setDwarfMinorVersion(profile.protocolMinorVersion) &&
    socket.setDeviceIdDwarf(profile.wireDeviceId) &&
    socket.setMinorVersionDwarf(profile.protocolMinorVersion);

  if (!configured) {
    throw new DwarfProtocolError(
      `Could not configure the V3 protocol for ${profile.displayName}`,
    );
  }
}

export function createV3SessionPackets(): Uint8Array[] {
  // Read-only state bootstrap is owned by CurrentWebSocketHandler.
  return [];
}

/**
 * Build the Mini/V3 wide preview-quality request used to make its RTSP feed
 * available. dwarfii_api 3.0.0 currently emits an empty payload for command
 * 12036, but current firmware expects level 1 (wire field 1), matching the
 * camera workflow captured in dwarfAlp.
 */
export function createV3WidePreviewPacket(): Uint8Array {
  const messageClass = Dwarfii_Api.V3ReqOpenWideCamera;
  const message = messageClass.create({ action: 1 });
  return createPacket(
    message,
    messageClass,
    Dwarfii_Api.ModuleId.MODULE_CAMERA_WIDE,
    Dwarfii_Api.DwarfCMD.CMD_V3_CAMERA_WIDE_OPEN_CAMERA,
    Dwarfii_Api.MessageTypeId.TYPE_REQUEST,
  );
}

/** Build the current task-manager shooting-mode request (command 16402). */
export function createV3ShootingModePacket(mode = 2): Uint8Array {
  // dwarfii_api 3.0.0 still calls this schema a mode query. Its field 1 has
  // the same wire representation as the current ReqSwitchShootingMode.mode.
  const messageClass = Dwarfii_Api.V3ReqModeQuery;
  const message = messageClass.create({ targetMode: mode });
  return createPacket(
    message,
    messageClass,
    Dwarfii_Api.ModuleId.MODULE_DEVICE_CONFIG,
    16402,
    Dwarfii_Api.MessageTypeId.TYPE_REQUEST,
  );
}

export const V3_SESSION_READY_COMMAND = 16405;

/**
 * Build the V3 one-click DSO command with the field names used by the current
 * firmware schema. dwarfii_api 3.0.0 still writes a legacy `mode` property,
 * which protobuf discards instead of serializing `shootingMode`.
 */
export function createV3OneClickGotoDsoPacket(
  raHours: number,
  decDegrees: number,
  targetName: string,
  longitude: number,
  latitude: number,
  shootingMode = 2,
): Uint8Array {
  const messageClass = Dwarfii_Api.ReqOneClickGotoDSO;
  const message = messageClass.create({
    ra: raHours,
    dec: decDegrees,
    targetName,
    lon: longitude,
    lat: latitude,
    shootingMode,
    gotoOnly: false,
  });
  return createPacket(
    message,
    messageClass,
    Dwarfii_Api.ModuleId.MODULE_ASTRO,
    Dwarfii_Api.DwarfCMD.CMD_ASTRO_START_ONE_CLICK_GOTO_DSO,
    Dwarfii_Api.MessageTypeId.TYPE_REQUEST,
  );
}

export function createV3OneClickGotoSolarPacket(
  index: number,
  longitude: number,
  latitude: number,
  targetName: string,
  shootingMode = 8,
): Uint8Array {
  const messageClass = Dwarfii_Api.ReqOneClickGotoSolarSystem;
  const message = messageClass.create({
    index,
    lon: longitude,
    lat: latitude,
    targetName,
    shootingMode,
    forceStart: false,
  });
  return createPacket(
    message,
    messageClass,
    Dwarfii_Api.ModuleId.MODULE_ASTRO,
    Dwarfii_Api.DwarfCMD.CMD_ASTRO_START_ONE_CLICK_GOTO_SOLAR_SYSTEM,
    Dwarfii_Api.MessageTypeId.TYPE_REQUEST,
  );
}
