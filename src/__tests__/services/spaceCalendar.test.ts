import {
  CATEGORIES,
  parseSpaceCalendarEvents,
  spaceCalendarUrl,
  upcomingSpaceCalendarEvents,
  type SpaceCalendarEvent,
} from "@/services/calendar/spaceCalendar";

const allDayEvent: SpaceCalendarEvent = {
  uid: "test-event",
  title: "Test event",
  start: "2026-09-24",
  end: "2026-09-25",
  allDay: true,
  description: "A test event",
  category: "deep-sky",
};

describe("Space Calendar feed", () => {
  it("uses the requested categories and saved northern observing location for both formats", () => {
    for (const format of ["json", "ics"] as const) {
      const url = new URL(spaceCalendarUrl(format, 49.477, "Europe/Berlin"));
      expect(url.pathname).toBe(`/feed.${format}`);
      expect(url.searchParams.get("c")).toBe(CATEGORIES);
      expect(url.searchParams.get("lat")).toBe("49");
      expect(url.searchParams.get("hemi")).toBe("north");
      expect(url.searchParams.get("tz")).toBe("Europe/Berlin");
      expect(url.searchParams.has("sid")).toBe(false);
    }
  });

  it("sets southern hemisphere and omits invalid latitude", () => {
    const southern = new URL(
      spaceCalendarUrl("json", -33.9, "Australia/Sydney"),
    );
    expect(southern.searchParams.get("lat")).toBe("-34");
    expect(southern.searchParams.get("hemi")).toBe("south");
    const invalid = new URL(spaceCalendarUrl("json", 180, "Invalid/Zone"));
    expect(invalid.searchParams.has("lat")).toBe(false);
    expect(invalid.searchParams.get("tz")).not.toBe("Invalid/Zone");
  });

  it("keeps an all-day event through its local calendar day", () => {
    expect(
      upcomingSpaceCalendarEvents(
        [allDayEvent],
        "Europe/Berlin",
        new Date("2026-09-24T22:30:00Z"),
      ),
    ).toHaveLength(0);
    expect(
      upcomingSpaceCalendarEvents(
        [allDayEvent],
        "America/Los_Angeles",
        new Date("2026-09-24T22:30:00Z"),
      ),
    ).toHaveLength(1);
  });

  it("validates data and excludes unsafe detail links", () => {
    expect(
      parseSpaceCalendarEvents({
        events: [{ ...allDayEvent, url: "javascript:alert(1)" }],
      })[0].url,
    ).toBeUndefined();
    expect(() => parseSpaceCalendarEvents({ notEvents: [] })).toThrow();
  });
});
