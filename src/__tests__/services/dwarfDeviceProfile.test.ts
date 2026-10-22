import { getCurrentProfile } from "dwarfii_api";
import {
  getDwarfDeviceName,
  getDwarfDeviceProfile,
} from "@/services/dwarf/deviceProfile";

describe("shared SDK device profiles", () => {
  test.each([
    [1, "dwarf2", "DWARF II", "0000DAF2", false],
    [2, "dwarf3", "DWARF 3", "0000DAF3", true],
    [4, "dwarfmini", "DWARF mini", "0000DAF4", true],
  ])(
    "maps hardware %i without conflating its wire identity",
    (id, model, displayName, clientPrefix, filterWheel) => {
      const profile = getDwarfDeviceProfile(id as number);
      const sdk = getCurrentProfile(id as number);
      expect(profile).toMatchObject({
        model,
        displayName,
        deviceId: id,
        wireDeviceId: sdk.wireDeviceId,
        clientId: sdk.clientId,
        protocolMajorVersion: sdk.majorVersion,
        protocolMinorVersion: sdk.minorVersion,
      });
      expect(profile.clientId.startsWith(clientPrefix as string)).toBe(true);
      expect(profile.capabilities.filterWheel).toBe(filterWheel);
      expect(profile.capabilities.rtspPreview).toBe(sdk.rtsp);
      expect(profile.teleFieldOfView.widthDegrees).toBeGreaterThan(2);
      expect(profile.teleFieldOfView.heightDegrees).toBeGreaterThan(1);
      expect(getDwarfDeviceName(id as number)).toBe(displayName);
    },
  );

  test("keeps Mini and DWARF 3 distinct despite sharing the V3 envelope family", () => {
    const dwarf3 = getDwarfDeviceProfile(2);
    const mini = getDwarfDeviceProfile(4);
    expect(dwarf3.deviceId).toBe(2);
    expect(mini.deviceId).toBe(4);
    expect(dwarf3.wireDeviceId).toBe(4);
    expect(mini.wireDeviceId).toBe(4);
    expect(dwarf3.clientId).not.toBe(mini.clientId);
    expect(dwarf3.teleFieldOfView).not.toEqual(mini.teleFieldOfView);
  });

  test.each([0, 3, 5, 99, NaN])(
    "fails closed for unknown hardware %s instead of defaulting to Mini",
    (id) => {
      expect(() => getDwarfDeviceProfile(id)).toThrow("Unsupported DWARF");
    },
  );
});
