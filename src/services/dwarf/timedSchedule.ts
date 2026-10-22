import {
  findCurrentCameraParameter,
  getCurrentProfile,
  resolveCurrentScienceFilter,
  selectCurrentExposure,
  selectCurrentParameterValue,
  type CurrentCameraCatalog,
} from "dwarfii_api";
import type { NativeSchedule } from "./schedules";

export type ScheduleDeviceIdentity = { hardwareId: number; macAddress: string };
export type TimedObservationRecipe = {
  name: string;
  target: string;
  rightAscension: string;
  declination: string;
  startAt: string;
  endAt: string;
  exposureSeconds: number;
  gain: number;
  filter: "astro" | "dual-band" | "visible";
  autofocus: boolean;
  eqMode: boolean;
  captureDarks: boolean;
};

function coordinate(text: string, ra: boolean) {
  const input = text.trim();
  const match =
    /^([+-]?)(\d+(?:\.\d+)?)(?::(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?)?$/.exec(
      input,
    );
  if (!match)
    throw new Error(
      "Use decimal or colon-separated RA hours and declination degrees.",
    );
  const minutes = Number(match[3] ?? 0),
    seconds = Number(match[4] ?? 0);
  if (
    minutes >= 60 ||
    seconds >= 60 ||
    (match[3] !== undefined && match[2].includes("."))
  )
    throw new Error("Coordinate minutes and seconds must be below 60.");
  const value =
    (match[1] === "-" ? -1 : 1) *
    (Number(match[2]) + minutes / 60 + seconds / 3600);
  if (
    !Number.isFinite(value) ||
    (ra ? value < 0 || value >= 24 : value < -90 || value > 90)
  )
    throw new Error(
      "RA must be [0, 24) hours and declination [-90, 90] degrees.",
    );
  return value;
}

function timestamp(input: string) {
  const date = new Date(input);
  const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    input,
  );
  if (
    local &&
    [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
    ].some((value, index) => value !== Number(local[index + 1] ?? 0))
  )
    throw new Error(
      "That local time does not exist or has an invalid date. Choose another time.",
    );
  return Math.floor(date.getTime() / 1000);
}

/** APK TaskParam is a time-window task: count/stacked are progress, not a
 * requested frame quota. A user supplies an explicit end, never a guessed one.
 */
export function buildTimedNativeSchedule(
  recipe: TimedObservationRecipe,
  catalog: CurrentCameraCatalog,
  identity: ScheduleDeviceIdentity,
  location: { latitude: number; longitude: number },
  now = Date.now(),
  createId: () => string = () => crypto.randomUUID(),
): NativeSchedule {
  const { latitude, longitude } = location;
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  )
    throw new Error(
      "Set a valid observing latitude and longitude before scheduling.",
    );
  if (!recipe.name.trim() || !recipe.target.trim())
    throw new Error("A timed session needs a name and target.");
  if (recipe.eqMode || recipe.captureDarks)
    throw new Error(
      "Native timed jobs do not implement automatic EQ setup or dark capture. Disable those preparation flags and prepare the device separately.",
    );
  const start = timestamp(recipe.startAt);
  const end = timestamp(recipe.endAt);
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start <= now / 1000 ||
    end <= start
  )
    throw new Error(
      "Choose an explicit future start and an end after the start for this timed job.",
    );
  if (end - start < 600)
    throw new Error("Native timed tasks must last at least 10 minutes.");
  const ra = coordinate(recipe.rightAscension, true),
    dec = coordinate(recipe.declination, false);
  const exposure = selectCurrentExposure(catalog, 0, recipe.exposureSeconds);
  const gainParameter = findCurrentCameraParameter(catalog, 0, "gain");
  const gain = selectCurrentParameterValue(gainParameter, recipe.gain);
  const filter = { visible: 0, astro: 1, "dual-band": 2 }[recipe.filter];
  resolveCurrentScienceFilter(getCurrentProfile(identity.hardwareId), filter);
  const id = createId(),
    taskId = createId();
  if (!id || !taskId || id === taskId)
    throw new Error("Could not create distinct schedule and task IDs.");
  const created = String(Math.floor(now / 1000));
  return {
    scheduleId: id,
    scheduleName: recipe.name.trim(),
    deviceId: identity.hardwareId,
    macAddress: identity.macAddress,
    startTime: String(start),
    endTime: String(end),
    result: 0,
    createdTime: created,
    updatedTime: created,
    // APK ScheduleDetailVM maps local draft (0) to pending-shoot (1) before sync.
    state: 1,
    lock: 0,
    password: "",
    paramMode: 0,
    paramVersion: 1,
    scheduleTime: String(start),
    syncState: 0,
    params: JSON.stringify({
      focusMode: recipe.autofocus ? 1 : 0,
      latitude,
      longitude,
      cityName: "",
      calibrationMode: 0,
    }),
    shootingTasks: [
      {
        scheduleId: id,
        scheduleTaskId: taskId,
        state: 0,
        code: 0,
        createdTime: created,
        updatedTime: created,
        paramMode: 0,
        paramVersion: 1,
        createFrom: 2,
        params: JSON.stringify({
          count: 0,
          dec,
          endTime: end,
          filterModeIndex: filter,
          filterModeName: { 0: "VIS", 1: "Astro", 2: "Duo-Band" }[filter],
          gainIndex: gain.value,
          gainName:
            gainParameter.options?.find((entry) => entry.value === gain.value)
              ?.label ?? String(gain.value),
          name: recipe.target.trim(),
          wellknownName: "",
          ra,
          shutterIndex: exposure.value,
          shutterName:
            findCurrentCameraParameter(catalog, 0, "exp").options?.find(
              (entry) => entry.value === exposure.value,
            )?.label ?? String(recipe.exposureSeconds),
          stacked: 0,
          startTime: start,
          isMosaicMode: false,
          horizontalScale: 100,
          verticalScale: 100,
          rotation: -1,
          atlasSortTypeValue: -6,
          cometQueryName: "",
        }),
      },
    ],
  };
}
