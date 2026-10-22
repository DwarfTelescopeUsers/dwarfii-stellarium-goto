import { getMosaicConfig } from "@/lib/mosaic_profile";

test("mosaic planner offers all DWARF models with device-profile fields of view", () => {
  const config = getMosaicConfig(4, 49.4773, 10.9898);
  expect(config.telescopes.map(({ name }) => name)).toEqual([
    "DWARF II",
    "DWARF 3",
    "DWARF mini",
  ]);
  expect(config.telescopes[2]).toMatchObject({
    fov_x: 128.4,
    fov_y: 73.2,
  });
  expect(config.defaultTelescope).toBe(2);
  expect(config.location).toEqual({ latitude: 49.4773, longitude: 10.9898 });
});
