import {
  buildLocation,
  buildClock,
  buildRightAscension,
  buildDeclination,
  buildCalculator,
} from "star-rise-and-set-times";
import vsop87Bearth from "astronomia/data/vsop87Bearth";
import vsop87Bjupiter from "astronomia/data/vsop87Bjupiter";
import vsop87Bmars from "astronomia/data/vsop87Bmars";
import vsop87Bmercury from "astronomia/data/vsop87Bmercury";
import vsop87Bneptune from "astronomia/data/vsop87Bneptune";
import vsop87Bsaturn from "astronomia/data/vsop87Bsaturn";
import vsop87Buranus from "astronomia/data/vsop87Buranus";
import vsop87Bvenus from "astronomia/data/vsop87Bvenus";
import { julian } from "astronomia";

import {
  globe,
  rise,
  sidereal,
  sexagesimal as sexa,
  planetposition,
} from "astronomia";

import { ObservationObject } from "@/types";
import { extractHMSValues, extractDMSValues } from "@/lib/math_utils";

type RiseSetTransit = {
  rise: TimeParts | null;
  set: TimeParts | null;
  transit: TimeParts | null;
};

type RiseSetTransitLocalTime = {
  rise: string | null;
  set: string | null;
  transit: string | null;
};

type TimeParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

type RiseSet = {
  rise: string;
  set: string;
};

function notLocalPlanet(object: ObservationObject) {
  return object.typeCategory !== "moon_planets";
}

// ==================
// star-rise-and-set-times
// star-rise-and-set-times can get rise, set times for DSO
// ==================

export function getRiseSetTime(
  object: ObservationObject,
  lat: number,
  lon: number,
  clock: any = buildClock().withRealTime()
) {
  const location = buildLocation().fromDegrees(lat, lon);

  let raParts = extractHMSValues(object.ra);
  if (raParts === undefined) return;
  let decParts = extractDMSValues(object.dec);
  if (decParts === undefined) return;

  const ra = buildRightAscension().fromHourMinSec(
    raParts.hour,
    raParts.minute,
    Math.floor(raParts.second)
  );

  const dec = buildDeclination().fromDegreesMinSec(
    decParts.negative,
    decParts.degree,
    decParts.minute,
    Math.floor(decParts.second)
  );
  const calculator = buildCalculator().forLocation(location).withClock(clock);

  return calculator.calculate(ra, dec);
}

export function getRiseSetTimeLocal(
  object: ObservationObject,
  lat: number,
  lon: number,
  clock: any = buildClock().withRealTime(),
  timezone: string
): RiseSet {
  let riseSetData = getRiseSetTime(object, lat, lon, clock);

  let riseTime = "--";
  if (riseSetData.riseTime?.text && notLocalPlanet(object)) {
    riseTime = formatRiseSetTime(riseSetData.riseTime.text, timezone);
  }

  let setTime = "--";
  if (riseSetData.setTime?.text && notLocalPlanet(object)) {
    setTime = formatRiseSetTime(riseSetData.setTime.text, timezone);
  }

  return { rise: riseTime, set: setTime };
}

export function formatRiseSetTime(hmsString: string, timezone: string) {
  // utc to local time https://stackoverflow.com/a/31453408
  let options: any = {
    timeZone: timezone,
    year: undefined,
    month: undefined,
    day: undefined,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  };
  let formatter = new Intl.DateTimeFormat([], options);
  let utc = new Date(`2001-02-03T${hmsString}.000Z`);
  return formatter.format(utc);
}

// ==================
// astronomia
// astronomia can get rise, set, transit times for DSO and planets
// ==================

export function getRiseSetTimeV2(
  object: ObservationObject,
  lat: number,
  lon: number,
  jd: number
): RiseSetTransit {
  const coord = {
    lat: new sexa.Angle(...sexa.degToDMS(lat)),
    lon: new sexa.Angle(...sexa.degToDMS(lon * -1)),
  };
  const h0 = rise.stdh0Stellar();

  let raParts = extractHMSValues(object.ra);
  const α = new sexa.RA(raParts?.hour, raParts?.minute, raParts?.second).rad();

  let decParts = extractDMSValues(object.dec);
  const δ = new sexa.Angle(
    decParts?.negative,
    decParts?.degree,
    decParts?.minute,
    decParts?.second
  ).rad();

  const p = new globe.Coord(coord.lat.rad(), coord.lon.rad());
  const Th0 = sidereal.apparent0UT(jd);
  const rs = rise.approxTimes(p, h0, Th0, α, δ);

  return {
    rise: formatTimeParts(rs.rise),
    transit: formatTimeParts(rs.transit),
    set: formatTimeParts(rs.set),
  };
}

function formatTimeParts(date: any): TimeParts {
  let time = new sexa.Time(date).toHMS();
  return {
    hours: time[1],
    minutes: time[2],
    seconds: Math.round(time[3]),
  };
}

export function getRiseSetTimePlanetV2(
  object: ObservationObject,
  lat: number,
  lon: number,
  date: Date
): RiseSetTransit {
  let planetData: any = {};
  switch (object.designation) {
    case "Jupiter":
      planetData = vsop87Bjupiter;
      break;
    case "Mars":
      planetData = vsop87Bmars;
      break;
    case "Mercury":
      planetData = vsop87Bmercury;
      break;
    case "Neptune":
      planetData = vsop87Bneptune;
      break;
    case "Saturn":
      planetData = vsop87Bsaturn;
      break;
    case "Uranus":
      planetData = vsop87Buranus;
      break;
    case "Venus":
      planetData = vsop87Bvenus;
      break;
    default:
      planetData = vsop87Bvenus;
      break;
  }
  const earth = new planetposition.Planet(vsop87Bearth);
  const targetPlanet = new planetposition.Planet(planetData);

  const rs = new rise.PlanetRise(date, lat, lon * -1, earth, targetPlanet, {
    date: true,
  }).approxTimes();

  return {
    rise: formatTimePartsPlanet(rs.rise),
    transit: formatTimePartsPlanet(rs.transit),
    set: formatTimePartsPlanet(rs.set),
  };
}

function formatTimePartsPlanet(date: Date): TimeParts {
  return {
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
    seconds: date.getUTCSeconds(),
  };
}

export function getRiseSetTimeLocalV2(
  object: ObservationObject,
  lat: number,
  lon: number,
  jd: number,
  timezone: string,
  useDaylightSavings = false,
  use24Hour = false
): RiseSetTransitLocalTime {
  let results: RiseSetTransitLocalTime = {
    rise: null,
    set: null,
    transit: null,
  };
  let tmp = {} as RiseSetTransit;

  if (notLocalPlanet(object)) {
    tmp = getRiseSetTimeV2(object, lat, lon, jd);
  } else {
    let date = new Date();
    tmp = getRiseSetTimePlanetV2(object, lat, lon, date);
  }

  if (tmp.rise !== null) {
    results.rise = convertTimePartsToString(
      tmp.rise,
      timezone,
      useDaylightSavings,
      use24Hour
    );
  }
  if (tmp.transit !== null) {
    results.transit = convertTimePartsToString(
      tmp.transit,
      timezone,
      useDaylightSavings,
      use24Hour
    );
  }
  if (tmp.set !== null) {
    results.set = convertTimePartsToString(
      tmp.set,
      timezone,
      useDaylightSavings,
      use24Hour
    );
  }

  return results;
}

export function convertTimePartsToString(
  timeParts: TimeParts,
  timezone: string,
  useDaylightSavings: boolean,
  use24Hour: boolean
): string {
  let pad = (num: number) => num.toString().padStart(2, "0");

  if (useDaylightSavings) {
    timeParts.hours += 1;
  }
  let hour = pad(timeParts.hours);
  let minute = pad(timeParts.minutes);
  // HACK: 60 seconds will cause invalid date error. Set 60 seconds to 59
  // to avoid invalid date and avoid incrementing minute and hour.
  let second = pad(timeParts.seconds === 60 ? 59 : timeParts.seconds);

  // convert utc time to local time for a given timezone
  let options: any = {
    timeZone: timezone,
    year: undefined,
    month: undefined,
    day: undefined,
    hour: "numeric",
    minute: "numeric",
    hour12: !use24Hour,
  };

  let formatter = new Intl.DateTimeFormat([], options);
  let utc = new Date(`2001-02-03T${hour}:${minute}:${second}.000Z`);
  return formatter.format(utc);
}

export function renderLocalRiseSetTime(
  object: ObservationObject,
  latitude: number,
  longitude: number
) {
  if (latitude && longitude) {
    // TODO: add component to let user set the time and save time in context
    let date = new Date();
    let jd = julian.CalendarGregorianToJD(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
    let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    let times = { rise: "--", set: "--", error: null };
    try {
      let result = getRiseSetTimeLocalV2(
        object,
        latitude,
        longitude,
        jd,
        timezone
      );
      if (result.rise) {
        times.rise = result.rise;
      }
      if (result.set) {
        times.set = result.set;
      }
    } catch (err: any) {
      console.log("err", err);
    }

    return times;
  }
}
