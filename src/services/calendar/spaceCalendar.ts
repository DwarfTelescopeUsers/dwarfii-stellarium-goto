export const CATEGORIES =
  "meteor-showers,eclipses-solar,eclipses-lunar,oppositions,conjunctions,alignments,occultations,asteroids,comets,deep-sky,milky-way";

export type SpaceCalendarEvent = {
  uid: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  description: string;
  url?: string;
  category: string;
};

export function calendarTimeZone(configured?: string): string {
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  if (!configured) return fallback;
  try {
    new Intl.DateTimeFormat("en", { timeZone: configured });
    return configured;
  } catch {
    return fallback;
  }
}

export function spaceCalendarUrl(
  format: "json" | "ics",
  latitude?: number,
  timeZone?: string,
): string {
  const url = new URL(`https://space-calendar.lukekorth.com/feed.${format}`);
  url.searchParams.set("c", CATEGORIES);
  if (
    latitude !== undefined &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90
  ) {
    url.searchParams.set("lat", String(Math.round(latitude)));
    url.searchParams.set("hemi", latitude < 0 ? "south" : "north");
  }
  url.searchParams.set("tz", calendarTimeZone(timeZone));
  return url.toString();
}

export function parseSpaceCalendarEvents(data: unknown): SpaceCalendarEvent[] {
  if (
    !data ||
    typeof data !== "object" ||
    !("events" in data) ||
    !Array.isArray(data.events)
  ) {
    throw new Error("Invalid Space Calendar response");
  }
  return data.events.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const event = item as Partial<SpaceCalendarEvent>;
    if (
      typeof event.uid !== "string" ||
      typeof event.title !== "string" ||
      typeof event.start !== "string" ||
      typeof event.end !== "string" ||
      Number.isNaN(Date.parse(event.start)) ||
      Number.isNaN(Date.parse(event.end))
    )
      return [];
    let safeUrl: string | undefined;
    if (typeof event.url === "string") {
      try {
        const url = new URL(event.url);
        if (url.protocol === "https:" || url.protocol === "http:")
          safeUrl = url.toString();
      } catch {
        /* Malformed detail link; keep the event. */
      }
    }
    return [
      {
        uid: event.uid,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay === true,
        description:
          typeof event.description === "string" ? event.description : "",
        url: safeUrl,
        category: typeof event.category === "string" ? event.category : "",
      },
    ];
  });
}

export function upcomingSpaceCalendarEvents(
  events: SpaceCalendarEvent[],
  timeZone: string,
  now = new Date(),
): SpaceCalendarEvent[] {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return events
    .filter((event) =>
      event.allDay
        ? event.end.slice(0, 10) > today // All-day end is exclusive.
        : Date.parse(event.end) >= now.getTime(),
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
