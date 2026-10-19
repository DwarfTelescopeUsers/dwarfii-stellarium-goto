import SunCalc from "suncalc";

export type ForecastLocation = {
  name: string;
  latitude: number;
  longitude: number;
};
export type ForecastHour = {
  time: number;
  temperature: number | null;
  humidity: number | null;
  dewPoint: number | null;
  rainChance: number | null;
  rain: number | null;
  cloud: number | null;
  lowCloud: number | null;
  midCloud: number | null;
  highCloud: number | null;
  wind: number | null;
  gusts: number | null;
};
export type Forecast = {
  location: ForecastLocation;
  timezone: string;
  hours: ForecastHour[];
  updatedAt: number;
};

export function validForecastLocation(value: any): value is ForecastLocation {
  return (
    !!value &&
    typeof value.name === "string" &&
    !!value.name.trim() &&
    Number.isFinite(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.longitude) <= 180
  );
}

async function json(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Forecast request limit reached. Please try again shortly."
        : "The forecast service is unavailable. Please try again.",
    );
  return response.json();
}

export async function findForecastLocations(
  query: string,
  signal: AbortSignal,
): Promise<ForecastLocation[]> {
  const params = new URLSearchParams({
    name: query.trim(),
    count: "5",
    language: "en",
    format: "json",
  });
  const data = await json(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    signal,
  );
  return (Array.isArray(data.results) ? data.results : [])
    .map((place: any) => ({
      name: [place.name, place.admin1, place.country]
        .filter(Boolean)
        .join(", "),
      latitude: place.latitude,
      longitude: place.longitude,
    }))
    .filter(validForecastLocation);
}

const variables = {
  temperature: "temperature_2m",
  humidity: "relative_humidity_2m",
  dewPoint: "dew_point_2m",
  rainChance: "precipitation_probability",
  rain: "precipitation",
  cloud: "cloud_cover",
  lowCloud: "cloud_cover_low",
  midCloud: "cloud_cover_mid",
  highCloud: "cloud_cover_high",
  wind: "wind_speed_10m",
  gusts: "wind_gusts_10m",
} as const;

export function parseForecast(
  data: any,
  location: ForecastLocation,
  now = Date.now(),
): Forecast {
  if (
    !validForecastLocation(location) ||
    typeof data?.timezone !== "string" ||
    !Array.isArray(data.hourly?.time) ||
    !data.hourly.time.length
  )
    throw new Error("The forecast service returned incomplete data.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: data.timezone }).format();
  } catch {
    throw new Error("The forecast service returned an invalid time zone.");
  }
  let previous = -Infinity;
  const hours = data.hourly.time.map((seconds: unknown, index: number) => {
    if (
      typeof seconds !== "number" ||
      !Number.isFinite(seconds) ||
      seconds <= previous
    )
      throw new Error("The forecast service returned invalid hourly times.");
    previous = seconds;
    const values = Object.fromEntries(
      Object.entries(variables).map(([key, variable]) => {
        const value = data.hourly[variable]?.[index];
        const percentage = [
          "humidity",
          "rainChance",
          "cloud",
          "lowCloud",
          "midCloud",
          "highCloud",
        ].includes(key);
        return [
          key,
          typeof value === "number" &&
          Number.isFinite(value) &&
          (!percentage || (value >= 0 && value <= 100))
            ? value
            : null,
        ];
      }),
    );
    return { time: seconds * 1000, ...values } as ForecastHour;
  });
  return { location, timezone: data.timezone, hours, updatedAt: now };
}

export async function loadForecast(
  location: ForecastLocation,
  signal: AbortSignal,
): Promise<Forecast> {
  if (!validForecastLocation(location))
    throw new Error("Choose a valid observing location.");
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    hourly: Object.values(variables).join(","),
    timezone: "auto",
    timeformat: "unixtime",
    wind_speed_unit: "ms",
    forecast_days: "8",
  });
  return parseForecast(
    await json(`https://api.open-meteo.com/v1/forecast?${params}`, signal),
    location,
  );
}

const localFormatters = new Map<string, Intl.DateTimeFormat>();
export function localForecastParts(time: number, timezone: string) {
  let formatter = localFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    localFormatters.set(timezone, formatter);
  }
  const parts = formatter.formatToParts(time);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    hour: Number(value.hour),
  };
}

export function nextForecastDate(date: string) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
}

/** Select by the location's civil clock, including both repeated DST hours. */
export function observingHours(forecast: Forecast, date: string) {
  const next = nextForecastDate(date);
  return forecast.hours.filter((hour) => {
    const local = localForecastParts(hour.time, forecast.timezone);
    return (
      (local.date === date && local.hour >= 18) ||
      (local.date === next && local.hour < 9)
    );
  });
}

export function forecastNights(forecast: Forecast) {
  const dates = Array.from(
    new Set(
      forecast.hours.map(
        (hour) => localForecastParts(hour.time, forecast.timezone).date,
      ),
    ),
  );
  return dates
    .filter((date) => {
      const night = observingHours(forecast, date);
      return (
        night.some(
          (hour) =>
            localForecastParts(hour.time, forecast.timezone).hour === 18,
        ) &&
        night.some(
          (hour) => localForecastParts(hour.time, forecast.timezone).hour === 8,
        )
      );
    })
    .slice(0, 7);
}

export function moonPhaseName(phase: number) {
  // Reserve major-phase labels for their vicinity, rather than calling a
  // visibly gibbous Moon "first quarter" by rounding to eighths of a cycle.
  if (phase < 0.01 || phase > 0.99) return "New Moon";
  if (Math.abs(phase - 0.25) < 0.01) return "First quarter";
  if (Math.abs(phase - 0.5) < 0.01) return "Full Moon";
  if (Math.abs(phase - 0.75) < 0.01) return "Last quarter";
  if (phase < 0.25) return "Waxing crescent";
  if (phase < 0.5) return "Waxing gibbous";
  if (phase < 0.75) return "Waning gibbous";
  return "Waning crescent";
}

export function skyAt(time: number, location: ForecastLocation) {
  const date = new Date(time);
  const moon = SunCalc.getMoonIllumination(date);
  const moonAltitude =
    (SunCalc.getMoonPosition(date, location.latitude, location.longitude)
      .altitude *
      180) /
    Math.PI;
  const sunAltitude =
    (SunCalc.getPosition(date, location.latitude, location.longitude).altitude *
      180) /
    Math.PI;
  return {
    illumination: moon.fraction * 100,
    phase: moonPhaseName(moon.phase),
    image: Math.min(29, Math.floor(moon.phase * 29.53059)),
    moonAltitude,
    sunAltitude,
    darkness:
      sunAltitude <= -18 ? "Dark" : sunAltitude < 0 ? "Twilight" : "Daylight",
  };
}

/** Collect absolute events across UTC dates, then restrict to this local night. */
export function nightEvents(hours: ForecastHour[], location: ForecastLocation) {
  if (!hours.length)
    return {} as Partial<
      Record<"moonrise" | "moonset" | "night" | "nightEnd", number>
    >;
  const start = hours[0].time,
    end = hours[hours.length - 1].time + 3600000;
  const events: Partial<
    Record<"moonrise" | "moonset" | "night" | "nightEnd", number>
  > = {};
  const day = Math.floor(start / 86400000) * 86400000;
  for (let time = day - 86400000; time <= end + 86400000; time += 86400000) {
    const date = new Date(time + 43200000);
    const moon = SunCalc.getMoonTimes(
      date,
      location.latitude,
      location.longitude,
      true,
    );
    const sun = SunCalc.getTimes(date, location.latitude, location.longitude);
    for (const [key, event] of Object.entries({
      moonrise: moon.rise,
      moonset: moon.set,
      night: sun.night,
      nightEnd: sun.nightEnd,
    })) {
      const value = event?.getTime();
      if (Number.isFinite(value) && value >= start && value < end)
        events[key] = value;
    }
  }
  return events;
}
