import React, { useContext, useEffect, useMemo, useState } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  calendarTimeZone,
  parseSpaceCalendarEvents,
  spaceCalendarUrl,
  upcomingSpaceCalendarEvents,
  type SpaceCalendarEvent,
} from "@/services/calendar/spaceCalendar";

type FeedStatus = "loading" | "ready" | "error";

function eventIcon(category: string) {
  if (category === "meteor-showers") return "bi-stars";
  if (category.startsWith("eclipses-")) return "bi-moon-stars";
  if (
    ["oppositions", "conjunctions", "alignments", "occultations"].includes(
      category,
    )
  )
    return "bi-globe";
  if (category === "asteroids" || category === "comets") return "bi-stars";
  return "bi-binoculars";
}

function eventDate(event: SpaceCalendarEvent) {
  return new Date(event.start);
}

function eventZone(event: SpaceCalendarEvent, timeZone: string) {
  // Date-only events stay on their calendar day, regardless of browser timezone.
  return event.allDay ? "UTC" : timeZone;
}

function datePart(
  event: SpaceCalendarEvent,
  timeZone: string,
  part: Intl.DateTimeFormatPartTypes,
) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: eventZone(event, timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(eventDate(event));
  return parts.find((item) => item.type === part)?.value || "";
}

export default function SpaceCalendarFeed() {
  const { latitude, timezone } = useContext(ConnectionContext);
  const timeZone = calendarTimeZone(timezone);
  const hasLatitude =
    latitude !== undefined &&
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90;
  const [feedItems, setFeedItems] = useState<SpaceCalendarEvent[]>([]);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [refreshKey, setRefreshKey] = useState(0);
  const feedUrl = spaceCalendarUrl("json", latitude, timeZone);
  const calendarUrl = spaceCalendarUrl("ics", latitude, timeZone);

  useEffect(() => {
    const controller = new AbortController();
    const fetchFeed = async () => {
      setStatus("loading");
      try {
        const response = await fetch(feedUrl, { signal: controller.signal });
        if (!response.ok)
          throw new Error(`Calendar request failed (${response.status})`);
        const events = parseSpaceCalendarEvents(await response.json());
        setFeedItems(upcomingSpaceCalendarEvents(events, timeZone));
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Error fetching astronomy calendar:", error);
        setStatus("error");
      }
    };
    void fetchFeed();
    return () => controller.abort();
  }, [feedUrl, refreshKey, timeZone]);

  const groupedEvents = useMemo(() => {
    const groups: {
      key: string;
      label: string;
      items: SpaceCalendarEvent[];
    }[] = [];
    feedItems.forEach((event) => {
      const key = `${datePart(event, timeZone, "year")}-${datePart(event, timeZone, "month")}`;
      const existing = groups.find((group) => group.key === key);
      if (existing) existing.items.push(event);
      else
        groups.push({
          key,
          label: eventDate(event).toLocaleDateString([], {
            timeZone: eventZone(event, timeZone),
            month: "long",
            year: "numeric",
          }),
          items: [event],
        });
    });
    return groups;
  }, [feedItems, timeZone]);

  return (
    <div className="dw-celestial-calendar">
      <div className="dw-calendar-toolbar">
        <div>
          <p className="dw-eyebrow">Space Calendar</p>
          <h2>Upcoming celestial events</h2>
          <p>
            Dates and times use {timeZone}.{" "}
            {hasLatitude
              ? "Your saved latitude informs location-dependent feed events."
              : "Set an observing location to personalize supported events."}{" "}
            Check each event’s details for local visibility.
          </p>
        </div>
        <div className="dw-calendar-actions">
          <a
            className="dw-button dw-button-secondary"
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bi bi-calendar-plus" aria-hidden="true" /> Subscribe
            (ICS)
          </a>
          <button
            className="dw-button dw-button-secondary"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={status === "loading"}
          >
            <i
              className={`bi bi-arrow-clockwise ${status === "loading" ? "is-spinning" : ""}`}
              aria-hidden="true"
            />
            {status === "loading" ? "Updating…" : "Refresh events"}
          </button>
        </div>
      </div>

      {status === "ready" && feedItems.length > 0 && (
        <div className="dw-calendar-summary">
          <article>
            <i className="bi bi-calendar3" aria-hidden="true" />
            <span>
              <small>Upcoming events</small>
              <strong>{feedItems.length}</strong>
            </span>
          </article>
          <article>
            <i className="bi bi-clock" aria-hidden="true" />
            <span>
              <small>Next event</small>
              <strong>
                {eventDate(feedItems[0]).toLocaleDateString([], {
                  timeZone: eventZone(feedItems[0], timeZone),
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </strong>
            </span>
          </article>
          <article>
            <i className="bi bi-geo-alt" aria-hidden="true" />
            <span>
              <small>Feed latitude</small>
              <strong>
                {hasLatitude
                  ? `${Math.round(latitude)}° ${latitude < 0 ? "S" : "N"}`
                  : "Not set"}
              </strong>
            </span>
          </article>
        </div>
      )}

      {status === "loading" && (
        <div className="dw-inline-empty" role="status">
          <span className="dw-spinner" aria-hidden="true" />
          <h2>Loading celestial events</h2>
          <p>Fetching the latest Space Calendar events.</p>
        </div>
      )}
      {status === "error" && (
        <div className="dw-inline-empty" role="alert">
          <i className="bi bi-cloud-slash" aria-hidden="true" />
          <h2>Calendar unavailable</h2>
          <p>
            Dwarfium could not reach Space Calendar. Check your internet
            connection, then try again.
          </p>
          <button
            className="dw-button dw-button-primary"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {status === "ready" && feedItems.length === 0 && (
        <div className="dw-inline-empty">
          <i className="bi bi-calendar-check" aria-hidden="true" />
          <h2>No upcoming events found</h2>
          <p>The feed has no future events to show right now.</p>
        </div>
      )}

      {status === "ready" && groupedEvents.length > 0 && (
        <div className="dw-calendar-groups">
          {groupedEvents.map((group) => (
            <section key={group.key} className="dw-calendar-month">
              <div className="dw-calendar-month-heading">
                <h3>{group.label}</h3>
                <span>
                  {group.items.length} event
                  {group.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="dw-calendar-events">
                {group.items.map((event) => {
                  const date = eventDate(event);
                  const zone = eventZone(event, timeZone);
                  return (
                    <article className="dw-calendar-event" key={event.uid}>
                      <time dateTime={event.start}>
                        <strong>{datePart(event, timeZone, "day")}</strong>
                        <span>
                          {date.toLocaleDateString([], {
                            timeZone: zone,
                            month: "short",
                          })}
                        </span>
                        <small>
                          {date.toLocaleDateString([], {
                            timeZone: zone,
                            weekday: "short",
                          })}
                        </small>
                      </time>
                      <div className="dw-calendar-event-icon">
                        <i
                          className={`bi ${eventIcon(event.category)}`}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="dw-calendar-event-content">
                        <div>
                          <h4>{event.title}</h4>
                          <span>
                            {event.allDay
                              ? "All day"
                              : date.toLocaleTimeString([], {
                                  timeZone,
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZoneName: "short",
                                })}
                          </span>
                        </div>
                        {event.description && <p>{event.description}</p>}
                      </div>
                      {event.url && (
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open details for ${event.title}`}
                        >
                          Details
                          <i
                            className="bi bi-arrow-up-right"
                            aria-hidden="true"
                          />
                        </a>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <footer className="dw-calendar-source">
        <i className="bi bi-info-circle" aria-hidden="true" />
        Event data provided by Space Calendar. Latitude is rounded to a whole
        degree by the feed; event listings do not guarantee visibility at your
        observing site.
      </footer>
    </div>
  );
}
