import {
  isPlannerSkySelection,
  plannerSkySelectionFromQuery,
  plannerSkySelectionHref,
} from "@/lib/observation_planner_transfer";

describe("Sky Atlas planner handoff", () => {
  const selection = {
    name: "Vega",
    rightAscension: "18:36:56.00",
    declination: "+38:47:01.0",
    fovWidthDegrees: 2.14,
    fovHeightDegrees: 1.22,
  };

  it("carries the selected framing in the planner URL", () => {
    const url = new URL(plannerSkySelectionHref(selection), "http://localhost");
    expect(url.pathname).toBe("/scheduler/");
    expect(
      plannerSkySelectionFromQuery(Object.fromEntries(url.searchParams)),
    ).toEqual(selection);
  });

  it("rejects incomplete or invalid planner links", () => {
    expect(
      plannerSkySelectionFromQuery({ from: "sky-atlas", ra: "18:36:56" }),
    ).toBeNull();
    expect(
      plannerSkySelectionFromQuery({
        ...Object.fromEntries(
          new URL(plannerSkySelectionHref(selection), "http://localhost")
            .searchParams,
        ),
        fovWidth: "NaN",
      }),
    ).toBeNull();
  });

  it("ignores malformed legacy selections", () => {
    expect(
      isPlannerSkySelection({ name: "Vega", fovWidthDegrees: "2.14" }),
    ).toBe(false);
    expect(isPlannerSkySelection(selection)).toBe(true);
  });
});
