import React from "react";
import { WeatherData } from "../Weather";
import WeatherIcon from "./WeatherIcon";

export default function WeatherInfo({ infoData }: { infoData: WeatherData }) {
  const current = infoData.forecast[0];
  const offset = infoData.timezone || 0;
  const localTime = new Date((current.dt + offset) * 1000).toLocaleString(
    "en-GB",
    {
      timeZone: "UTC",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  const cloudCover = current.clouds?.all;
  const rainChance = current.pop;

  return (
    <section className="dw-weather-current" aria-label="Next forecast period">
      <div className="dw-weather-current-main">
        <div className="dw-weather-location">
          <span className="dw-weather-eyebrow">Next forecast period</span>
          <h2>
            {infoData.city}
            {infoData.country ? `, ${infoData.country}` : ""}
          </h2>
          <p>
            {localTime} local · {current.weather[0].description}
          </p>
        </div>
        <div className="dw-weather-reading">
          <WeatherIcon icon={current.weather[0].icon} size={50} />
          <strong>{Math.round(current.main.temp)}°</strong>
          <span>C</span>
        </div>
      </div>
      <div className="dw-weather-metrics">
        <div>
          <span>Feels like</span>
          <strong>{Math.round(current.main.feels_like)}°C</strong>
        </div>
        <div>
          <span>Cloud cover</span>
          <strong>
            {typeof cloudCover === "number" ? `${cloudCover}%` : "—"}
          </strong>
        </div>
        <div>
          <span>Rain chance</span>
          <strong>
            {typeof rainChance === "number"
              ? `${Math.round(rainChance * 100)}%`
              : "—"}
          </strong>
        </div>
        <div>
          <span>Wind</span>
          <strong>{Math.round(current.wind.speed * 3.6)} km/h</strong>
        </div>
        <div>
          <span>Humidity</span>
          <strong>{Math.round(current.main.humidity)}%</strong>
        </div>
      </div>
    </section>
  );
}
