import { useContext, useEffect, useRef, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  findForecastLocations,
  loadForecast,
  validForecastLocation,
  localForecastParts,
  forecastNights,
  observingHours,
  skyAt,
  nightEvents,
  type Forecast,
  type ForecastLocation,
} from "@/services/forecast";
import styles from "@/styles/forecast.module.css";

const locationKey = "dwarfium.forecast.location.v1";
function savedValue(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
const number = (value: number | null | undefined, unit = "", digits = 0) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : `${value.toFixed(digits)}${unit}`;

export default function ForecastDashboard() {
  const context = useContext(ConnectionContext);
  const [query, setQuery] = useState("");
  const [choices, setChoices] = useState<ForecastLocation[]>([]);
  const [forecast, setForecast] = useState<Forecast>();
  const [site, setSite] = useState<ForecastLocation>();
  const [night, setNight] = useState("");
  const [selectedTime, setSelectedTime] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController>();

  function begin() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setChoices([]);
    setForecast(undefined);
    return controller;
  }

  async function chooseLocation(location: ForecastLocation) {
    const previousNight =
      forecast?.location.latitude === location.latitude &&
      forecast?.location.longitude === location.longitude
        ? night
        : undefined;
    const controller = begin();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const data = await loadForecast(location, controller.signal);
      if (controller.signal.aborted || pending.current !== controller) return;
      setForecast(data);
      const nights = forecastNights(data);
      const today = localForecastParts(Date.now(), data.timezone).date;
      setNight(
        previousNight && nights.includes(previousNight)
          ? previousNight
          : nights.includes(today)
            ? today
            : (nights[0] ?? ""),
      );
      setSelectedTime(undefined);
      try {
        localStorage.setItem(locationKey, JSON.stringify(location));
      } catch {
        /* Storage is optional. */
      }
    } catch (failure) {
      if (pending.current === controller)
        setError(
          controller.signal.aborted
            ? "The forecast request timed out. Please try again."
            : failure instanceof Error
              ? failure.message
              : "Could not load the forecast.",
        );
    } finally {
      clearTimeout(timeout);
      if (pending.current === controller) setBusy(false);
    }
  }

  async function searchCity(city: string) {
    if (!city.trim()) {
      setError("Enter a city or use your observing location.");
      return;
    }
    const controller = begin();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const results = await findForecastLocations(city, controller.signal);
      if (controller.signal.aborted || pending.current !== controller) return;
      if (results.length === 1) {
        await chooseLocation(results[0]);
        return;
      }
      if (!results.length)
        setError("No matching location found. Try a nearby city.");
      else setChoices(results);
    } catch (failure) {
      if (pending.current === controller)
        setError(
          controller.signal.aborted
            ? "Location search timed out. Please try again."
            : failure instanceof Error
              ? failure.message
              : "Could not find this city.",
        );
    } finally {
      clearTimeout(timeout);
      if (pending.current === controller) setBusy(false);
    }
  }

  useEffect(() => {
    let saved: ForecastLocation | undefined;
    try {
      const value = JSON.parse(savedValue(locationKey) ?? "null");
      if (validForecastLocation(value)) saved = value;
    } catch {
      /* Fall back to the observing site. */
    }
    const latitude = savedValue("latitude"),
      longitude = savedValue("longitude");
    const observingSite = {
      name: "Observing location",
      latitude: latitude?.trim() ? Number(latitude) : NaN,
      longitude: longitude?.trim() ? Number(longitude) : NaN,
    };
    if (validForecastLocation(observingSite)) setSite(observingSite);
    if (saved) void chooseLocation(saved);
    else if (validForecastLocation(observingSite))
      void chooseLocation(observingSite);
    else {
      const city = savedValue("city") ?? "";
      setQuery(city);
      if (city) void searchCity(city);
    }
    return () => {
      pending.current?.abort();
      pending.current = undefined;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const location = {
      name: "Observing location",
      latitude: context.latitude,
      longitude: context.longitude,
    };
    if (validForecastLocation(location)) setSite(location);
  }, [context.latitude, context.longitude]);

  const hours = forecast && night ? observingHours(forecast, night) : [];
  const hour =
    hours.find((item) => item.time === selectedTime) ??
    hours.find((item) => item.time + 3600000 > Date.now()) ??
    hours[0];
  const sky =
    hour && forecast ? skyAt(hour.time, forecast.location) : undefined;
  const events = forecast ? nightEvents(hours, forecast.location) : {};
  const time = (value?: number) =>
    value === undefined || !forecast
      ? "Not this night"
      : new Intl.DateTimeFormat(undefined, {
          timeZone: forecast.timezone,
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        }).format(value);
  const dateLabel = (date: string) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));
  const clearHour = forecast
    ? hours
        .filter(
          (item) =>
            item.cloud !== null &&
            item.time + 3600000 > Date.now() &&
            skyAt(item.time, forecast.location).sunAltitude <= -18,
        )
        .sort((a, b) => a.cloud! - b.cloud!)[0]
    : undefined;

  return (
    <div className="dw-page">
      <Head>
        <title>Forecast dashboard · Dwarfium</title>
      </Head>
      <PageHeader
        eyebrow="Conditions"
        title="Forecast dashboard"
        description="Weather, clouds and Moon conditions for your observing night."
      />
      <section
        className={`dw-panel ${styles.locationPanel}`}
        aria-label="Forecast location"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void searchCity(query);
          }}
          className={styles.search}
        >
          <label>
            City
            <input
              type="search"
              value={query}
              placeholder="Search a city"
              autoComplete="address-level2"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button className="dw-button" type="submit" disabled={busy}>
            Find location
          </button>
          <button
            className="dw-button is-secondary"
            type="button"
            disabled={!site || busy}
            onClick={() => site && void chooseLocation(site)}
          >
            Use observing location
          </button>
        </form>
        {choices.length > 0 && (
          <div className={styles.choices}>
            <p>Choose a location</p>
            {choices.map((location) => (
              <button
                key={`${location.latitude}:${location.longitude}`}
                type="button"
                className="dw-button is-secondary"
                onClick={() => void chooseLocation(location)}
              >
                {location.name}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {busy && (
          <p role="status" className="dw-muted">
            Loading observing conditions…
          </p>
        )}
        {!busy && !forecast && !error && !choices.length && (
          <p className="dw-muted">
            Choose a location to see the next seven nights. No API key needed.
          </p>
        )}
      </section>
      {forecast && (
        <>
          <section className={styles.nightHeader} aria-label="Observing night">
            <div>
              <h2>{forecast.location.name}</h2>
              <p className="dw-muted">18:00–09:00 · {forecast.timezone}</p>
            </div>
            <div className={styles.nightActions}>
              <label>
                Observing night
                <select
                  value={night}
                  onChange={(event) => {
                    setNight(event.target.value);
                    setSelectedTime(undefined);
                  }}
                >
                  {forecastNights(forecast).map((date) => (
                    <option value={date} key={date}>
                      {dateLabel(date)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="dw-button is-secondary"
                onClick={() => void chooseLocation(forecast.location)}
              >
                Refresh
              </button>
            </div>
          </section>
          {!hour || !sky ? (
            <section className="dw-panel">
              <p role="status">
                No hourly forecast is available for this night.
              </p>
            </section>
          ) : (
            <>
              <p className={styles.selection}>
                Conditions at <strong>{time(hour.time)}</strong> ·{" "}
                {sky.darkness}
              </p>
              <div className={styles.metrics}>
                <Metric
                  title="Temperature"
                  icon="bi-thermometer-half"
                  value={number(hour.temperature, " °C", 1)}
                  detail={`Humidity ${number(hour.humidity, "%")} · Dew point ${number(hour.dewPoint, " °C", 1)}`}
                />
                <Metric
                  title="Cloud cover"
                  icon="bi-clouds"
                  value={number(hour.cloud, "%")}
                  detail={`Rain chance ${number(hour.rainChance, "%")} · Precipitation ${number(hour.rain, " mm", 1)}`}
                />
                <Metric
                  title="Wind"
                  icon="bi-wind"
                  value={number(hour.wind, " m/s", 1)}
                  detail={`Gusts ${number(hour.gusts, " m/s", 1)}`}
                />
                <Metric
                  title="Moon illumination"
                  icon="bi-moon-stars"
                  value={number(sky.illumination, "%")}
                  detail={`${sky.phase} · ${sky.moonAltitude >= 0 ? "Above" : "Below"} horizon`}
                />
              </div>
              <div className={styles.skyGrid}>
                <section
                  className={`dw-panel ${styles.cloudPanel}`}
                  aria-label="Cloud forecast"
                >
                  <h2>Clouds through the night</h2>
                  <p className="dw-muted">
                    Select an hour to see its weather and Moon conditions.
                  </p>
                  <div
                    className={styles.timeline}
                    role="group"
                    aria-label="Hourly cloud cover"
                  >
                    {hours.map((item) => {
                      const dark =
                        skyAt(item.time, forecast.location).sunAltitude <= -18;
                      return (
                        <button
                          type="button"
                          key={item.time}
                          aria-pressed={item.time === hour.time}
                          onClick={() => setSelectedTime(item.time)}
                          aria-label={`${time(item.time)}, ${number(item.cloud, "%")} cloud cover`}
                          className={`${styles.hour} ${dark ? styles.dark : ""}`}
                        >
                          <span>
                            {String(
                              localForecastParts(item.time, forecast.timezone)
                                .hour,
                            ).padStart(2, "0")}
                          </span>
                          <span
                            className={styles.cloudTrack}
                            aria-hidden="true"
                          >
                            <span style={{ height: `${item.cloud ?? 0}%` }} />
                          </span>
                          <strong>{number(item.cloud, "%")}</strong>
                        </button>
                      );
                    })}
                  </div>
                  <div className={styles.layers}>
                    {(
                      [
                        ["Low clouds", hour.lowCloud],
                        ["Mid clouds", hour.midCloud],
                        ["High clouds", hour.highCloud],
                      ] as const
                    ).map(([name, value]) => (
                      <div key={name}>
                        <span>{name}</span>
                        <span className={styles.layerTrack}>
                          <span style={{ width: `${value ?? 0}%` }} />
                        </span>
                        <strong>{number(value, "%")}</strong>
                      </div>
                    ))}
                  </div>
                  <p className={styles.hint}>
                    {clearHour ? (
                      <>
                        Clearest forecast during astronomical darkness:{" "}
                        <strong>{time(clearHour.time)}</strong> ·{" "}
                        {number(clearHour.cloud, "%")} cloud cover.
                      </>
                    ) : (
                      "No upcoming hour with astronomical darkness and cloud data in this window."
                    )}
                  </p>
                </section>
                <section
                  className={`dw-panel ${styles.moonPanel}`}
                  aria-label="Moon and darkness"
                >
                  <h2>Moon & darkness</h2>
                  <div className={styles.moonSummary}>
                    <Image
                      src={`/assets/images/Moon/Moon-${sky.image}.jpg`}
                      width={88}
                      height={88}
                      alt={sky.phase}
                    />
                    <div>
                      <strong>{sky.phase}</strong>
                      <p>{number(sky.illumination, "%")} illuminated</p>
                      <p>Altitude {number(sky.moonAltitude, "°")}</p>
                    </div>
                  </div>
                  <dl className={styles.events}>
                    <div>
                      <dt>Moonrise</dt>
                      <dd>{time(events.moonrise)}</dd>
                    </div>
                    <div>
                      <dt>Moonset</dt>
                      <dd>{time(events.moonset)}</dd>
                    </div>
                    <div>
                      <dt>Astronomical dusk</dt>
                      <dd>{time(events.night)}</dd>
                    </div>
                    <div>
                      <dt>Astronomical dawn</dt>
                      <dd>{time(events.nightEnd)}</dd>
                    </div>
                  </dl>
                  <p className={styles.hint}>
                    {sky.moonAltitude < 0
                      ? "The Moon is below the horizon at the selected hour."
                      : "The Moon is above the horizon at the selected hour."}
                  </p>
                  <Link
                    href={{
                      pathname: "/moonphase",
                      query: {
                        latitude: forecast.location.latitude,
                        longitude: forecast.location.longitude,
                        timezone: forecast.timezone,
                        location: forecast.location.name,
                        month: night.slice(0, 7),
                      },
                    }}
                  >
                    Open lunar calendar →
                  </Link>
                </section>
              </div>
              <section
                className={`dw-panel ${styles.hourlyPanel}`}
                aria-label="Hourly observing forecast"
              >
                <h2>Hourly forecast</h2>
                <div
                  className={styles.tableScroll}
                  tabIndex={0}
                  role="region"
                  aria-label="Hourly forecast table"
                >
                  <table>
                    <caption className="visually-hidden">
                      Weather and Moon conditions for {dateLabel(night)},{" "}
                      {forecast.timezone}
                    </caption>
                    <thead>
                      <tr>
                        {[
                          "Hour",
                          "Cloud",
                          "Rain chance",
                          "Temp.",
                          "Humidity",
                          "Dew point",
                          "Wind",
                          "Gusts",
                          "Moon altitude",
                          "Sky",
                        ].map((label) => (
                          <th key={label} scope="col">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hours.map((item) => {
                        const lunar = skyAt(item.time, forecast.location);
                        return (
                          <tr
                            key={item.time}
                            className={
                              item.time === hour.time ? styles.selectedRow : ""
                            }
                          >
                            <th scope="row">{time(item.time)}</th>
                            <td>{number(item.cloud, "%")}</td>
                            <td>{number(item.rainChance, "%")}</td>
                            <td>{number(item.temperature, " °C", 1)}</td>
                            <td>{number(item.humidity, "%")}</td>
                            <td>{number(item.dewPoint, " °C", 1)}</td>
                            <td>{number(item.wind, " m/s", 1)}</td>
                            <td>{number(item.gusts, " m/s", 1)}</td>
                            <td>{number(lunar.moonAltitude, "°")}</td>
                            <td>{lunar.darkness}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          <p className={styles.source}>
            Updated{" "}
            {new Intl.DateTimeFormat(undefined, {
              timeZone: forecast.timezone,
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            }).format(forecast.updatedAt)}{" "}
            · Weather and location data:{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            · Moon and darkness calculated with{" "}
            <a
              href="https://github.com/mourner/suncalc"
              target="_blank"
              rel="noreferrer"
            >
              SunCalc
            </a>
            . All times are local to the forecast location.
          </p>
        </>
      )}
    </div>
  );
}

function Metric({
  title,
  icon,
  value,
  detail,
}: {
  title: string;
  icon: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={`dw-panel ${styles.metric}`}>
      <p>
        <i className={`bi ${icon}`} aria-hidden="true" /> {title}
      </p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
