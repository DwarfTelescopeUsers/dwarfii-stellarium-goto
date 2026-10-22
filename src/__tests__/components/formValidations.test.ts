import { validateAstroSettings } from "@/components/imaging/form_validations";

const settings = {
  gain: 80,
  exposure: 120,
  wideGain: undefined,
  wideExposure: undefined,
  IR: 1,
  binning: undefined,
  fileFormat: undefined,
  count: 25,
  AiEnhance: undefined,
};

describe("astrophotography settings validation", () => {
  test("accepts complete Mini telephoto settings without unrelated legacy or wide-camera values", () => {
    expect(
      validateAstroSettings(settings, {
        camera: "telephoto",
        requireLegacyFields: false,
      }),
    ).toEqual({});
  });

  test("validates only the active wide-angle camera values", () => {
    expect(
      validateAstroSettings(
        { ...settings, wideGain: 60, wideExposure: 120 },
        { camera: "wide" },
      ),
    ).toEqual({});
  });

  test("rejects an empty frame count", () => {
    expect(
      validateAstroSettings(
        { ...settings, count: 0 },
        { camera: "telephoto", requireLegacyFields: false },
      ),
    ).toHaveProperty("count");
  });

  test("still requires legacy settings on devices that expose them", () => {
    expect(
      validateAstroSettings(settings, {
        camera: "telephoto",
        requireLegacyFields: true,
      }),
    ).toMatchObject({
      binning: expect.any(String),
      fileFormat: expect.any(String),
      AiEnhance: expect.any(String),
    });
  });
});
