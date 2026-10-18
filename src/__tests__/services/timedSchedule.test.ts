import { encodeCurrentParamId, type CurrentCameraCatalog } from "dwarfii_api";
import {
  buildTimedNativeSchedule,
  type TimedObservationRecipe,
} from "@/services/dwarf/timedSchedule";

const id = (paramIndex: number) =>
  encodeCurrentParamId({
    shootingMode: 2,
    category: 1,
    cameraId: 0,
    paramIndex,
  });
export const timedCatalog: CurrentCameraCatalog = {
  modeId: 2,
  cameras: [
    {
      cameraId: 0,
      parameters: [
        {
          key: "exp",
          label: "Exposure",
          source: "special",
          paramId: id(1),
          options: [{ value: 162, label: "60", seconds: 60 }],
        },
        {
          key: "gain",
          label: "Gain",
          source: "special",
          paramId: id(2),
          options: [{ value: 60, label: "60" }],
        },
      ],
    },
  ],
};
export const timedRecipe: TimedObservationRecipe = {
  name: "M45 timed",
  target: "M45",
  rightAscension: "03:47:01.2",
  declination: "+24:06:00",
  startAt: "2033-05-18T03:33:20Z",
  endAt: "2033-05-18T03:43:20Z",
  exposureSeconds: 60,
  gain: 60,
  filter: "dual-band",
  autofocus: true,
  eqMode: false,
  captureDarks: false,
};
const identity = { hardwareId: 4, macAddress: "00:11:22:33:44:55" };
const location = { latitude: 10, longitude: 20 };

test("builds an official version-1 timed job with hours, seconds, and live exposure codes", () => {
  let sequence = 0;
  const schedule = buildTimedNativeSchedule(
    timedRecipe,
    timedCatalog,
    identity,
    location,
    1000,
    () => `id-${++sequence}`,
  );
  expect(schedule).toMatchObject({
    scheduleId: "id-1",
    deviceId: 4,
    macAddress: identity.macAddress,
    startTime: "2000000000",
    endTime: "2000000600",
    scheduleTime: "2000000000",
    state: 1,
    paramMode: 0,
    paramVersion: 1,
  });
  expect(JSON.parse(String(schedule.params))).toEqual({
    focusMode: 1,
    latitude: 10,
    longitude: 20,
    cityName: "",
    calibrationMode: 0,
  });
  const task = (schedule.shootingTasks as any[])[0];
  expect(task).toMatchObject({
    scheduleTaskId: "id-2",
    scheduleId: "id-1",
    paramVersion: 1,
    createFrom: 2,
  });
  const params = JSON.parse(task.params);
  expect(params.ra).toBeCloseTo(3.7836666667);
  expect(params).toMatchObject({
    dec: 24.1,
    startTime: 2000000000,
    endTime: 2000000600,
    shutterIndex: 162,
    shutterName: "60",
    gainIndex: 60,
    filterModeIndex: 2,
    count: 0,
    stacked: 0,
    isMosaicMode: false,
    horizontalScale: 100,
    verticalScale: 100,
    rotation: -1,
    atlasSortTypeValue: -6,
  });
});

test.each([
  { eqMode: true },
  { captureDarks: true },
  { exposureSeconds: 30 },
  { gain: 70 },
  { rightAscension: "24:00:00" },
  { rightAscension: "01:60:00" },
  { declination: "90:00:01" },
  { endAt: "" },
  { endAt: timedRecipe.startAt },
  { endAt: "2033-05-18T03:43:19Z" },
])(
  "rejects unsupported or ambiguous recipe %j before a schedule exists",
  (override) => {
    expect(() =>
      buildTimedNativeSchedule(
        { ...timedRecipe, ...override },
        timedCatalog,
        identity,
        location,
        1000,
      ),
    ).toThrow();
  },
);

test("does not allow Mini Visible filter or unknown observing location", () => {
  expect(() =>
    buildTimedNativeSchedule(
      { ...timedRecipe, filter: "visible" },
      timedCatalog,
      identity,
      location,
      1000,
    ),
  ).toThrow();
  expect(() =>
    buildTimedNativeSchedule(
      timedRecipe,
      timedCatalog,
      identity,
      { latitude: NaN, longitude: 20 },
      1000,
    ),
  ).toThrow("observing");
});

test("does not silently normalize a nonexistent Berlin DST local start time", () => {
  expect(() =>
    buildTimedNativeSchedule(
      {
        ...timedRecipe,
        startAt: "2027-03-28T02:30",
        endAt: "2027-03-28T04:00",
      },
      timedCatalog,
      identity,
      location,
      1000,
    ),
  ).toThrow("local time does not exist");
});
