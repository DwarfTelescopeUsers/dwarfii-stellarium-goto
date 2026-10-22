import React from "react";
import { ForecastEntry, WeatherData } from "../Weather";
import WeatherIcon from "./WeatherIcon";

interface DaySummary {
  date: Date;
  high: number;
  low: number;
  icon: string;
  description: string;
  cloudTotal: number;
  cloudCount: number;
  rainChance: number;
  displayHour: number;
}

function localForecastDate(entry: ForecastEntry, offset: number) {
  return new Date((entry.dt + offset) * 1000);
}

export default function WeatherForecast({
  infoData,
}: {
  infoData: WeatherData;
}) {
  const offset = infoData.timezone || 0;
  const todayKey = new Date(Date.now() + offset * 1000)
    .toISOString()
    .slice(0, 10);
  const days = new Map<string, DaySummary>();

  for (const entry of infoData.forecast) {
    if (typeof entry.dt !== "number" || !entry.main || !entry.weather?.[0])
      continue;
    const date = localForecastDate(entry, offset);
    const key = date.toISOString().slice(0, 10);
    const cloud = entry.clouds?.all;
    const hour = date.getUTCHours();
    const existing = days.get(key);
    if (existing) {
      existing.high = Math.max(existing.high, entry.main.temp_max);
      existing.low = Math.min(existing.low, entry.main.temp_min);
      existing.rainChance = Math.max(existing.rainChance, entry.pop || 0);
      if (typeof cloud === "number") {
        existing.cloudTotal += cloud;
        existing.cloudCount++;
      }
      if (Math.abs(hour - 12) < Math.abs(existing.displayHour - 12)) {
        existing.icon = entry.weather[0].icon;
        existing.description = entry.weather[0].description;
        existing.displayHour = hour;
      }
    } else {
      days.set(key, {
        date,
        high: entry.main.temp_max,
        low: entry.main.temp_min,
        icon: entry.weather[0].icon,
        description: entry.weather[0].description,
        cloudTotal: typeof cloud === "number" ? cloud : 0,
        cloudCount: typeof cloud === "number" ? 1 : 0,
        rainChance: entry.pop || 0,
        displayHour: hour,
      });
    }
  }

  return (
    <section className="dw-weather-forecast" aria-label="Five-day forecast">
      <div className="dw-weather-section-heading">
        <div>
          <span className="dw-weather-eyebrow">Plan ahead</span>
          <h2>Five-day forecast</h2>
        </div>
        <p>Daily high and low · average cloud cover · highest rain chance</p>
      </div>
      <div className="dw-weather-days">
        {Array.from(days.values())
          .slice(0, 5)
          .map((day) => (
            <article className="dw-weather-day" key={day.date.toISOString()}>
              <div className="dw-weather-day-heading">
                <strong>
                  {day.date.toISOString().slice(0, 10) === todayKey
                    ? "Today"
                    : day.date.toLocaleDateString("en-GB", {
                        timeZone: "UTC",
                        weekday: "short",
                      })}
                </strong>
                <span>
                  {day.date.toLocaleDateString("en-GB", {
                    timeZone: "UTC",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <div className="dw-weather-day-condition">
                <WeatherIcon icon={day.icon} size={32} />
                <span>{day.description}</span>
              </div>
              <div className="dw-weather-day-temperature">
                <strong>{Math.round(day.high)}°</strong>
                <span>{Math.round(day.low)}°</span>
              </div>
              <div className="dw-weather-day-details">
                <span>
                  Clouds{" "}
                  <strong>
                    {day.cloudCount
                      ? `${Math.round(day.cloudTotal / day.cloudCount)}%`
                      : "—"}
                  </strong>
                </span>
                <span>
                  Rain <strong>{Math.round(day.rainChance * 100)}%</strong>
                </span>
              </div>
            </article>
          ))}
      </div>
      <p className="dw-weather-source">
        Forecast by OpenWeather · three-hour estimates, not a guarantee of
        observing conditions.
      </p>
    </section>
  );
}
