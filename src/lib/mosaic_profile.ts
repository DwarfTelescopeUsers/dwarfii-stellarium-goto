import { getDwarfDeviceProfile } from "@/services/dwarf/deviceProfile";

const mosaicDeviceIds = [1, 2, 4];

export function getMosaicConfig(
  activeDeviceId?: number,
  latitude?: number,
  longitude?: number,
) {
  return {
    telescopes: mosaicDeviceIds.map((id) => {
      const profile = getDwarfDeviceProfile(id);
      return {
        name: profile.displayName,
        fov_x: profile.teleFieldOfView.widthDegrees * 60,
        fov_y: profile.teleFieldOfView.heightDegrees * 60,
      };
    }),
    defaultTelescope: Math.max(0, mosaicDeviceIds.indexOf(activeDeviceId ?? 0)),
    location:
      typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      typeof longitude === "number" &&
      Number.isFinite(longitude)
        ? { latitude, longitude }
        : null,
  };
}
