import {
  getRiseSetTime,
  getRiseSetTimeLocal,
  getRiseSetTimeV2,
  getRiseSetTimeLocalV2,
  getRiseSetTimePlanetV2,
} from "@/lib/astro_utils";
import { ObservationObject } from "@/types";
import { julian } from "astronomia";
import { buildClock } from "star-rise-and-set-times";

let Vega: ObservationObject = {
  dec: "+38°47'01.0\"",
  designation: "Vega",
  displayName: "",
  type: "",
  typeCategory: "",
  ra: "18h36m56.00s",
  magnitude: "",
  catalogue: "",
  objectNumber: 0,
  constellation: "",
};
// NYC -4, HK +8
let lat_NYC = 40.7128;
let lon_NYC = -74.006;
let lat_HK = 22.3964;
let lon_HK = 114.1095;

describe("getRiseSetTime", () => {
  it("returns rise and set times for negative longitude", () => {
    let object = Vega;
    let lat = lat_NYC;
    let lon = lon_NYC;
    let clock = buildClock().withFixedUTCTime(2023, 6, 2, 3, 0, 0);

    let expected = {
      neverRises: false,
      neverSets: false,
      riseTime: { hours: 21, minutes: 57, seconds: 27, text: "21:57:27" },
      setTime: { hours: 15, minutes: 48, seconds: 27, text: "15:48:27" },
    };

    let res = getRiseSetTime(object, lat, lon, clock);

    expect(res).toEqual(expected);
  });

  it("returns rise and set times for positive longitude", () => {
    let object = Vega;
    let lat = lat_HK;
    let lon = lon_HK;
    let clock = buildClock().withFixedUTCTime(2023, 6, 2, 3, 0, 0);

    let expected = {
      neverRises: false,
      neverSets: false,
      riseTime: { hours: 11, minutes: 0, seconds: 29, text: "11:00:29" },
      setTime: { hours: 1, minutes: 36, seconds: 44, text: "01:36:44" },
    };

    let res = getRiseSetTime(object, lat, lon, clock);

    expect(res).toEqual(expected);
  });
});

describe("getRiseSetTimeLocal", () => {
  it("returns local rise and set times for negative longitude", () => {
    let object = Vega;
    let lat = lat_NYC;
    let lon = lon_NYC;
    let clock = buildClock().withFixedUTCTime(2023, 6, 2, 3, 0, 0);
    let timezone = "America/New_York";

    let expected = {
      rise: "16:57",
      set: "10:48",
    };

    let res = getRiseSetTimeLocal(object, lat, lon, clock, timezone);

    expect(res).toEqual(expected);
  });

  it("returns rise and set times for positive longitude", () => {
    let object = Vega;
    let lat = lat_HK;
    let lon = lon_HK;
    let clock = buildClock().withFixedUTCTime(2023, 6, 2, 3, 0, 0);
    let timezone = "Asia/Hong_Kong";

    let expected = {
      rise: "19:00",
      set: "09:36",
    };

    let res = getRiseSetTimeLocal(object, lat, lon, clock, timezone);

    expect(res).toEqual(expected);
  });
});

describe("getRiseSetTimeV2", () => {
  // https://github.com/commenthol/astronomia/blob/master/test/rise.test.js
  it("works for example posted in astronomia", () => {
    let object: ObservationObject = {
      dec: "+18°26'27.3\"",
      designation: "",
      displayName: "",
      type: "",
      typeCategory: "",
      ra: "2h46m55.51s",
      magnitude: "",
      catalogue: "",
      objectNumber: 0,
      constellation: "",
    };
    let expected = {
      rise: {
        hours: 12,
        minutes: 26,
        seconds: 9,
      },
      transit: {
        hours: 19,
        minutes: 40,
        seconds: 17,
      },
      set: {
        hours: 2,
        minutes: 54,
        seconds: 26,
      },
    };
    const jd = julian.CalendarGregorianToJD(1988, 3, 20);
    let res = getRiseSetTimeV2(object, 42.3333, -71.0833, jd);

    expect(res).toEqual(expected);
  });

  it("returns rise and set times for a object with negative longitude", () => {
    let object = Vega;
    let lat = lat_NYC;
    let lon = lon_NYC;
    let expected = {
      rise: {
        hours: 21,
        minutes: 51,
        seconds: 46,
      },
      set: {
        hours: 15,
        minutes: 52,
        seconds: 29,
      },
      transit: {
        hours: 6,
        minutes: 52,
        seconds: 8,
      },
    };

    const jd = julian.CalendarGregorianToJD(2023, 6, 2);
    let res = getRiseSetTimeV2(object, lat, lon, jd);

    expect(res).toEqual(expected);
  });

  it("returns rise and set times for a object with positive longitude", () => {
    let object = Vega;
    let lat = lat_HK;
    let lon = lon_HK;
    let expected = {
      rise: {
        hours: 10,
        minutes: 58,
        seconds: 58,
      },
      set: {
        hours: 1,
        minutes: 40,
        seconds: 22,
      },
      transit: {
        hours: 18,
        minutes: 19,
        seconds: 40,
      },
    };

    const jd = julian.CalendarGregorianToJD(2023, 6, 2);
    let res = getRiseSetTimeV2(object, lat, lon, jd);

    expect(res).toEqual(expected);
  });
});

describe("getRiseSetTimeLocalV2", () => {
  it("returns local rise and set times for a object with negative longitude", () => {
    let object = Vega;
    let lat = lat_NYC;
    let lon = lon_NYC;
    let timezone = "America/New_York";
    let expected = {
      rise: "4:51 PM",
      set: "10:52 AM",
      transit: "1:52 AM",
    };

    const jd = julian.CalendarGregorianToJD(2023, 6, 2);
    let res = getRiseSetTimeLocalV2(object, lat, lon, jd, timezone);

    expect(res).toEqual(expected);
  });

  it("returns local rise and set times for a object with positive longitude", () => {
    let object = Vega;
    let lat = lat_HK;
    let lon = lon_HK;
    let timezone = "Asia/Hong_Kong";
    let expected = {
      rise: "6:58 PM",
      set: "9:40 AM",
      transit: "2:19 AM",
    };

    const jd = julian.CalendarGregorianToJD(2023, 6, 2);
    let res = getRiseSetTimeLocalV2(object, lat, lon, jd, timezone);

    expect(res).toEqual(expected);
  });

  it("returns local rise and set times for daylight savings", () => {
    let object = Vega;
    let lat = lat_NYC;
    let lon = lon_NYC;
    let timezone = "America/New_York";
    let useDaylightSavings = true;
    let expected = {
      rise: "5:51 PM",
      set: "11:52 AM",
      transit: "2:52 AM",
    };

    const jd = julian.CalendarGregorianToJD(2023, 6, 2);
    let res = getRiseSetTimeLocalV2(
      object,
      lat,
      lon,
      jd,
      timezone,
      useDaylightSavings
    );

    expect(res).toEqual(expected);
  });

  it("returns local rise and set times for 24 hour format", () => {
    let object = Vega;
    let lat = lat_NYC;
    let lon = lon_NYC;
    let timezone = "America/New_York";
    let useDaylightSavings = false;
    let use24Hour = true;
    let expected = {
      rise: "16:51",
      set: "10:52",
      transit: "01:52",
    };

    const jd = julian.CalendarGregorianToJD(2023, 6, 2);
    let res = getRiseSetTimeLocalV2(
      object,
      lat,
      lon,
      jd,
      timezone,
      useDaylightSavings,
      use24Hour
    );

    expect(res).toEqual(expected);
  });
});

describe("getRiseSetTimePlanet", () => {
  it("returns rise and set times for a given planet", () => {
    const date = new Date(0);
    date.setUTCFullYear(1988);
    date.setUTCMonth(3 - 1);
    date.setUTCDate(20);
    let object: ObservationObject = {
      designation: "Venus",
      dec: "",
      displayName: "",
      type: "",
      typeCategory: "",
      ra: "",
      magnitude: "",
      catalogue: "",
      objectNumber: 0,
      constellation: "",
    };
    let expected = {
      rise: { hours: 12, minutes: 26, seconds: 9 },
      transit: { hours: 19, minutes: 40, seconds: 17 },
      set: { hours: 2, minutes: 54, seconds: 25 },
    };

    let res = getRiseSetTimePlanetV2(object, 42.333333, -71.083333, date);
    expect(res).toEqual(expected);
  });
});
