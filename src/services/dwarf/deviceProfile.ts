import { getCurrentProfile } from "dwarfii_api";

export type DwarfModel = "dwarf2" | "dwarf3" | "dwarfmini";

export type DwarfCapabilities = Readonly<{
  teleCamera: boolean;
  wideCamera: boolean;
  rtspPreview: boolean;
  filterWheel: boolean;
  astroAutofocus: boolean;
  darkFrameContinue: boolean;
}>;

export type DwarfDeviceProfile = Readonly<{
  model: DwarfModel;
  /** Hardware/catalog identity; this is NOT the WebSocket envelope device ID. */
  deviceId: number;
  wireDeviceId: number;
  displayName: string;
  clientId: string;
  protocolMajorVersion: number;
  protocolMinorVersion: number;
  teleFieldOfView: Readonly<{
    widthDegrees: number;
    heightDegrees: number;
  }>;
  capabilities: DwarfCapabilities;
}>;

type DisplayProfile = Pick<
  DwarfDeviceProfile,
  "displayName" | "teleFieldOfView" | "capabilities"
>;

// Display/FOV fallbacks are separate from the authoritative SDK wire profile.
// Runtime camera catalogs/state can refine these advertised capabilities.
const displayProfiles: Record<DwarfModel, DisplayProfile> = {
  dwarf2: {
    displayName: "DWARF II",
    teleFieldOfView: { widthDegrees: 3, heightDegrees: 1.69 },
    capabilities: {
      teleCamera: true,
      wideCamera: true,
      rtspPreview: false,
      filterWheel: false,
      astroAutofocus: true,
      darkFrameContinue: false,
    },
  },
  dwarf3: {
    displayName: "DWARF 3",
    teleFieldOfView: { widthDegrees: 2.93, heightDegrees: 1.65 },
    capabilities: {
      teleCamera: true,
      wideCamera: true,
      rtspPreview: true,
      filterWheel: true,
      astroAutofocus: true,
      darkFrameContinue: true,
    },
  },
  dwarfmini: {
    displayName: "DWARF mini",
    teleFieldOfView: { widthDegrees: 2.14, heightDegrees: 1.22 },
    capabilities: {
      teleCamera: true,
      wideCamera: true,
      rtspPreview: true,
      filterWheel: true,
      astroAutofocus: true,
      darkFrameContinue: true,
    },
  },
};

export function getDwarfDeviceProfile(deviceId: number): DwarfDeviceProfile {
  const profile = getCurrentProfile(deviceId);
  return {
    ...displayProfiles[profile.model],
    model: profile.model,
    deviceId: profile.hardwareId,
    wireDeviceId: profile.wireDeviceId,
    clientId: profile.clientId,
    protocolMajorVersion: profile.majorVersion,
    protocolMinorVersion: profile.minorVersion,
  };
}

export function getDwarfDeviceName(deviceId: number): string {
  return getDwarfDeviceProfile(deviceId).displayName;
}
