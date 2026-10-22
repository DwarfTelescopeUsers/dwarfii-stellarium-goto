import {
  allowedExposures,
  allowedGains,
  allowedIRs,
  getExposureDefault,
} from "@/lib/data_utils";
import {
  allowedWideExposures,
  allowedWideGains,
  getWideExposureDefault,
} from "@/lib/data_wide_utils";

describe("DWARF Mini camera options", () => {
  test("uses the Mini telephoto exposure, gain, and filter ranges", () => {
    expect(allowedExposures[4].values.at(0)).toEqual({
      index: 120,
      name: "1",
    });
    expect(allowedExposures[4].values.at(-1)).toEqual({
      index: 168,
      name: "180",
    });
    expect(allowedGains[4].values.map(({ name }) => name)).toEqual([
      "40",
      "50",
      "60",
      "70",
      "80",
      "90",
      "100",
    ]);
    expect(allowedIRs[4].values).toEqual([
      { index: 0, name: "Astro Filter" },
      { index: 1, name: "Duo-Band Filter" },
    ]);
    expect(getExposureDefault(4)).toBe("15");
  });

  test("uses the Mini wide-angle exposure and gain ranges", () => {
    expect(allowedWideExposures[4].values.at(0)?.name).toBe("1");
    expect(allowedWideExposures[4].values.at(-1)?.name).toBe("30");
    expect(allowedWideGains[4].values.at(0)?.name).toBe("40");
    expect(allowedWideGains[4].values.at(-1)?.name).toBe("100");
    expect(getWideExposureDefault(4)).toBe("15");
  });
});
