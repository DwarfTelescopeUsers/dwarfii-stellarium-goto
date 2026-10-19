import {
  findForecastLocations,
  loadForecast,
  parseForecast,
  observingHours,
  localForecastParts,
  forecastNights,
  skyAt,
  nightEvents,
  moonPhaseName,
} from "@/services/forecast";

const location = { name: "Berlin", latitude: 52.52, longitude: 13.41 };
test("quarter labels do not mislabel a visibly gibbous Moon", () => {
  expect(moonPhaseName(0.25)).toBe("First quarter");
  expect(moonPhaseName(0.3)).toBe("Waxing gibbous");
  expect(moonPhaseName(0.7)).toBe("Waning gibbous");
  expect(moonPhaseName(0.5)).toBe("Full Moon");
});
function source(timezone = "Europe/Berlin") {
  return {
    timezone,
    hourly: {
      time: Array.from(
        { length: 96 },
        (_, index) => Date.parse("2026-10-23T00:00:00Z") / 1000 + index * 3600,
      ),
      temperature_2m: [null, 0],
      cloud_cover: [null, 0, 150],
      relative_humidity_2m: [null, 75],
    },
  };
}

test("observing nights use the forecast location's clock and include the repeated DST hour", () => {
  const forecast = parseForecast(source(), location);
  const night = observingHours(forecast, "2026-10-24");
  expect(night).toHaveLength(16);
  expect(localForecastParts(night[0].time, forecast.timezone)).toEqual({
    date: "2026-10-24",
    hour: 18,
  });
  expect(localForecastParts(night.at(-1)!.time, forecast.timezone)).toEqual({
    date: "2026-10-25",
    hour: 8,
  });
  expect(
    night.filter(
      (hour) => localForecastParts(hour.time, forecast.timezone).hour === 2,
    ),
  ).toHaveLength(2);
  expect(forecastNights(forecast)).toEqual([
    "2026-10-23",
    "2026-10-24",
    "2026-10-25",
  ]);
});

test("missing weather stays unknown, genuine zero stays zero, invalid percentages stay unknown", () => {
  const forecast = parseForecast(source(), location);
  expect(forecast.hours[0].temperature).toBeNull();
  expect(forecast.hours[0].cloud).toBeNull();
  expect(forecast.hours[1].temperature).toBe(0);
  expect(forecast.hours[1].cloud).toBe(0);
  expect(forecast.hours[2].cloud).toBeNull();
  expect(forecast.hours[2].wind).toBeNull();
});

test("forecast rejects invalid time zones and out-of-order timestamps", () => {
  expect(() => parseForecast(source("invalid/zone"), location)).toThrow(
    "time zone",
  );
  const data = source();
  data.hourly.time[1] = data.hourly.time[0];
  expect(() => parseForecast(data, location)).toThrow("hourly times");
});

test("Moon and darkness are computed at the same absolute hour, events stay within the observing night", () => {
  const forecast = parseForecast(source(), location);
  const hours = observingHours(forecast, "2026-10-24");
  const sky = skyAt(hours[5].time, location);
  expect(sky.illumination).toBeGreaterThanOrEqual(0);
  expect(sky.illumination).toBeLessThanOrEqual(100);
  expect(sky.moonAltitude).toBeGreaterThanOrEqual(-90);
  expect(sky.moonAltitude).toBeLessThanOrEqual(90);
  for (const time of Object.values(nightEvents(hours, location))) {
    expect(time).toBeGreaterThanOrEqual(hours[0].time);
    expect(time).toBeLessThan(hours.at(-1)!.time + 3600000);
  }
});

test("one keyless request obtains weather and layered clouds with UTC timestamps and explicit wind units", async () => {
  const original = global.fetch;
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => source() });
  const signal = new AbortController().signal;
  try {
    await loadForecast(location, signal);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    const params = new URL(url).searchParams;
    expect(params.get("timeformat")).toBe("unixtime");
    expect(params.get("timezone")).toBe("auto");
    expect(params.get("wind_speed_unit")).toBe("ms");
    expect(params.get("hourly")).toContain("cloud_cover_low");
    expect(params.has("apikey")).toBe(false);
    expect(options.signal).toBe(signal);
  } finally {
    global.fetch = original;
  }
});

test("geocoding returns selectable locations and filters malformed coordinates", async () => {
  const original = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      results: [
        { name: "Berlin", country: "Germany", latitude: 52.5, longitude: 13.4 },
        { name: "Broken", latitude: 100, longitude: 0 },
      ],
    }),
  });
  try {
    expect(
      await findForecastLocations("Berlin", new AbortController().signal),
    ).toEqual([{ name: "Berlin, Germany", latitude: 52.5, longitude: 13.4 }]);
  } finally {
    global.fetch = original;
  }
});
