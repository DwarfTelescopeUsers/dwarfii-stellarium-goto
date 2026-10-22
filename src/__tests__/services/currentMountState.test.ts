import {
  calibrationCoordinates,
  mountOperationLabel,
  oneClickGotoPhase,
} from "@/services/dwarf/mountState";

test.each([
  ["astroAutoFocusState", "Autofocus"],
  ["astroCalibrationState", "Calibration"],
  ["astroGotoState", "GOTO"],
  ["astroTrackingState", "Tracking"],
])("reads canonical oneof %s", (key, phase) => {
  expect(oneClickGotoPhase({ [key]: { state: 1, targetName: "M31" } })).toEqual(
    { phase, state: 1, targetName: "M31" },
  );
});

test("unknown, legacy, and conflicting phases do not invent progress", () => {
  for (const data of [
    {},
    { trackingState: { state: 1 } },
    { phase_2: 1 },
    { astroTrackingState: { state: 9 } },
    { astroGotoState: {}, astroTrackingState: {} },
  ]) {
    expect(oneClickGotoPhase(data)).toBeUndefined();
  }
});

test("omitted scalar in a present phase is idle, not completion", () => {
  expect(oneClickGotoPhase({ astroCalibrationState: {} })?.state).toBe(0);
  expect(mountOperationLabel(0)).toBe("Idle");
  expect(mountOperationLabel(99)).toBe("Unknown state");
});

test("only solved coordinates are calibration evidence", () => {
  expect(calibrationCoordinates({ state: 0 })).toBeUndefined();
  expect(calibrationCoordinates({ code: 0 })).toBeUndefined();
  expect(calibrationCoordinates({})).toBeUndefined();
  expect(calibrationCoordinates({ azi: NaN, alt: 10 })).toBeUndefined();
  expect(calibrationCoordinates({ azi: 0, alt: 10 })).toEqual({
    azimuth: 0,
    altitude: 10,
  });
  expect(calibrationCoordinates({ azi: 120 })).toEqual({
    azimuth: 120,
    altitude: 0,
  });
});
