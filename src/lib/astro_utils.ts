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

import { AstroObject } from "@/types";
import { extractHMSValues, extractDMSValues } from "@/lib/math_utils";
import { isDstObserved } from "@/lib/date_utils";
import { padNumber } from "@/lib/math_utils";

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

function notLocalPlanet(object: AstroObject) {
  return object.typeCategory !== "moon_planets";
}

export function getRiseSetTime(
  object: AstroObject,
  lat: number,
  lon: number,
  jd: number
): RiseSetTransit | undefined {
  if (object.ra === null) {
    return;
  }
  if (object.dec === null) {
    return;
  }

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

export function getRiseSetTimePlanet(
  object: AstroObject,
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

export function getRiseSetTimeLocal(
  object: AstroObject,
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
    let times = getRiseSetTime(object, lat, lon, jd);
    if (times) {
      tmp = times;
    }
  } else {
    let date = new Date();
    tmp = getRiseSetTimePlanet(object, lat, lon, date);
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
  if (useDaylightSavings) {
    timeParts.hours += 1;
  }
  let hour = padNumber(timeParts.hours);
  let minute = padNumber(timeParts.minutes);
  // HACK: 60 seconds will cause invalid date error. Set 60 seconds to 59
  // to avoid invalid date and avoid incrementing minute and hour.
  let second = padNumber(timeParts.seconds === 60 ? 59 : timeParts.seconds);

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
  object: AstroObject,
  latitude: number,
  longitude: number
) {
  // TODO: add component to let user set the time and save time in context
  let date = new Date();
  let jd = julian.CalendarGregorianToJD(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
  let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let times = { rise: "--", set: "--", error: null };
  let useDaylightSavings = isDstObserved(date);

  try {
    let result = getRiseSetTimeLocal(
      object,
      latitude,
      longitude,
      jd,
      timezone,
      useDaylightSavings
    );
    if (result.rise) {
      times.rise = result.rise;
    }
    if (result.set) {
      times.set = result.set;
    }
  } catch (err: any) {
    if (err.message === "always above horizon") {
      times.error = err.message;
    } else if (err.message === "always below horizon") {
      times.error = err.message;
    } else {
      // console.log("err", err);
    }
  }

  return times;
}

// https://stackoverflow.com/a/14779469
// get difference for local timezone and with day-light saving awareness.
function diffDays(date1: Date, date2: Date): number {
  var utc1 = Date.UTC(
    date1.getFullYear(),
    date1.getMonth(),
    date1.getDate(),
    date1.getHours(),
    date1.getMinutes(),
    date1.getSeconds(),
    date1.getMilliseconds()
  );
  var utc2 = Date.UTC(
    date2.getFullYear(),
    date2.getMonth(),
    date2.getDate(),
    date2.getHours(),
    date2.getMinutes(),
    date2.getSeconds(),
    date2.getMilliseconds()
  );

  return (utc1 - utc2) / 86400000;
}

export function computeRaDecToAltAz(
  lat: number,
  lon: number,
  raDecimal: number,
  decDecimal: number,
  date: Date
) {
  // https://www.cloudynights.com/topic/446389-alt-az-calculator-spreadsheet/
  // http://www.stargazing.net/kepler/altaz.html

  let toRad = Math.PI / 180;

  function calculateLST(longitudeDecimal: number, date: Date) {
    let past = new Date("2000-01-01T00:00:00.000Z");
    let daysSinceJ2000 = diffDays(date, past) - 0.2;
    let hour = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();
    let offset = date.getTimezoneOffset() / 60;
    let UT_diff = offset > 0 ? offset * -1 : offset;

    let UT = (hour + minute / 60 + second / 3600 - UT_diff) % 24;
    let LST =
      (100.46 + 0.985647 * daysSinceJ2000 + longitudeDecimal + 15 * UT) % 360;
    return LST;
  }

  function calculateHA(raDecimal: number, LST: number) {
    return LST - raDecimal;
  }

  function calculateAlt(
    latitude: number,
    decDegree: number,
    decMinute: number,
    HA: number
  ) {
    return (
      Math.asin(
        Math.sin(toRad * (decDegree + decMinute / 60)) * Math.sin(toRad * lat) +
          Math.cos(toRad * (decDegree + decMinute / 60)) *
            Math.cos(toRad * latitude) *
            Math.cos(toRad * HA)
      ) / toRad
    );
  }

  function calculateAz(
    latitudeDecimal: number,
    decDegree: number,
    decMinute: number,
    HA: number,
    alt: number
  ) {
    let azTemp =
      Math.acos(
        (Math.sin(toRad * (decDegree + decMinute / 60)) -
          Math.sin(toRad * alt) * Math.sin(toRad * latitudeDecimal)) /
          (Math.cos(toRad * alt) * Math.cos(toRad * latitudeDecimal))
      ) / toRad;

    return Math.sin(toRad * HA) < 0 ? azTemp : 360 - azTemp;
  }

  let decDegree =
    decDecimal > 0 ? Math.floor(decDecimal) : Math.ceil(decDecimal);
  let decMinute = decDecimal - decDegree;

  let LST = calculateLST(lon, date);
  let HA = calculateHA(raDecimal, LST);
  let alt = calculateAlt(lat, decDegree, decMinute, HA);
  let az = calculateAz(lat, decDegree, decMinute, HA, alt);

  return { alt, az };
}

export function convertAzToCardinal(azDecimal: number) {
  if (azDecimal >= 0 && azDecimal <= 45) {
    return "N";
  } else if (azDecimal > 45 && azDecimal <= 90) {
    return "NE";
  } else if (azDecimal > 90 && azDecimal <= 135) {
    return "E";
  } else if (azDecimal > 135 && azDecimal <= 180) {
    return "SE";
  } else if (azDecimal > 180 && azDecimal <= 225) {
    return "S";
  } else if (azDecimal > 225 && azDecimal <= 270) {
    return "SW";
  } else if (azDecimal > 270 && azDecimal <= 315) {
    return "W";
  } else {
    return "NW";
  }
}
