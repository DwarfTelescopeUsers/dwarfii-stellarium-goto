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
  rise: string;
  set: string;
  transit: string;
};

type RiseSet = {
  rise: string;
  set: string;
};

function notLocalPlanet(object: ObservationObject) {
  return (
    object.objtype !== "moon" &&
    object.objtype !== "planet" &&
    object.designation !== "Sun"
  );
}

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
    rise: new sexa.Time(rs.rise).toString(0),
    transit: new sexa.Time(rs.transit).toString(0),
    set: new sexa.Time(rs.set).toString(0),
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
    rise: formatHMS(rs.rise),
    transit: formatHMS(rs.transit),
    set: formatHMS(rs.set),
  };
}

function formatHMS(date: Date) {
  return `${date.getUTCHours()}ʰ${date.getUTCMinutes()}ᵐ${date.getUTCSeconds()}ˢ`;
}

export function getRiseSetTimeLocalV2(
  object: ObservationObject,
  lat: number,
  lon: number,
  jd: number,
  timezone: string
): RiseSetTransit {
  if (notLocalPlanet(object)) {
    let times = getRiseSetTimeV2(object, lat, lon, jd);
    return foo(times, timezone);
  } else if (object.objtype === "planet") {
    let date = new Date();
    let times = getRiseSetTimePlanetV2(object, lat, lon, date);
    return foo(times, timezone);
  } else {
    return { rise: "--", set: "--", transit: "--" };
  }
}

function foo(times: RiseSetTransit, timezone: string): RiseSetTransit {
  let results = { rise: "--", set: "--", transit: "--" };
  let formattedRise = formatRiseSetTimeV2(times.rise, timezone);
  if (formattedRise) {
    results.rise = formattedRise;
  }
  let formattedSet = formatRiseSetTimeV2(times.set, timezone);
  if (formattedSet) {
    results.set = formattedSet;
  }
  let formattedTransit = formatRiseSetTimeV2(times.transit, timezone);
  if (formattedTransit) {
    results.transit = formattedTransit;
  }

  return results;
}

export function formatRiseSetTimeV2(hmsString: string, timezone: string) {
  let pad = (num: number) => num.toString().padStart(2, "0");

  let matches = hmsString.match(/(\d+)ʰ(\d+)ᵐ(\d+)ˢ/);
  if (matches) {
    let hour = pad(Number(matches[1]));
    let minute = pad(Number(matches[2]));
    let second = pad(Number(matches[3]));

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
    let utc = new Date(`2001-02-03T${hour}:${minute}:${second}.000Z`);
    return formatter.format(utc);
  }
}
