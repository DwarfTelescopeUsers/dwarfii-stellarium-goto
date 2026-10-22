import React, { useContext, useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { getProxyUrl } from "@/lib/get_proxy_url";
import WeatherInfo from "./weather/WeatherInfo";
import WeatherForecast from "./weather/WeatherForecast";

export interface ForecastEntry {
  dt: number;
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    feels_like: number;
    humidity: number;
  };
  wind: { speed: number };
  clouds?: { all?: number };
  pop?: number;
  weather: Array<{ description: string; icon: string }>;
}

interface ForecastResponse {
  cod?: number | string;
  city?: { name?: string; country?: string; timezone?: number };
  list?: ForecastEntry[];
}

export interface WeatherData {
  city: string;
  country?: string;
  timezone?: number;
  forecast: ForecastEntry[];
}

function Weather() {
  const { t } = useTranslation();
  const connectionCtx = useContext(ConnectionContext);
  const [cityInput, setCityInput] = useState(
    () => (typeof window !== "undefined" && localStorage.getItem("city")) || "",
  );
  const [apiKey, setApiKey] = useState(
    () =>
      (typeof window !== "undefined" && localStorage.getItem("apiKey")) || "",
  );
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function search(city: string, key: string) {
    const normalizedCity = city.trim();
    const normalizedKey = key.trim();
    setError(null);
    setNotice(null);
    if (!normalizedCity) {
      setError("Enter a city before loading the weather forecast.");
      return;
    }
    if (!normalizedKey) {
      setError("Enter your OpenWeather API key before loading the forecast.");
      return;
    }

    setIsLoading(true);
    try {
      const target = new URL(
        "https://api.openweathermap.org/data/2.5/forecast",
      );
      target.searchParams.set("q", normalizedCity);
      target.searchParams.set("appid", normalizedKey);
      target.searchParams.set("units", "metric");
      const proxyUrl = connectionCtx.proxyIP && getProxyUrl(connectionCtx);
      const url = proxyUrl
        ? `${proxyUrl}?target=${encodeURIComponent(target.href)}`
        : target.href;
      const { data } = await axios.get<ForecastResponse>(url);
      if (Number(data.cod) === 401) {
        setWeatherData(null);
        setError("OpenWeather rejected the API key. Check it and try again.");
        return;
      }
      if (Number(data.cod) === 404) {
        setWeatherData(null);
        setError("City not found. Check the spelling and try again.");
        return;
      }
      const entries = data.list;
      const first = entries?.[0];
      if (
        !data.city?.name ||
        !first ||
        typeof first.dt !== "number" ||
        typeof first.main?.temp !== "number" ||
        typeof first.wind?.speed !== "number" ||
        !first.weather?.[0]?.icon
      ) {
        throw new Error("incomplete-forecast");
      }

      setWeatherData({
        city: data.city.name,
        country: data.city.country,
        timezone: data.city.timezone,
        forecast: entries,
      });
      setCityInput(data.city.name);
      localStorage.setItem("city", data.city.name);
    } catch (requestError) {
      const status = (requestError as AxiosError)?.response?.status;
      setWeatherData(null);
      setError(
        status === 401
          ? "OpenWeather rejected the API key. Check it and try again."
          : status === 404
            ? "City not found. Check the spelling and try again."
            : status === 429
              ? "OpenWeather request limit reached. Please try again later."
              : "The weather forecast could not be loaded. Check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const savedCity = localStorage.getItem("city");
    const savedKey = localStorage.getItem("apiKey");
    if (savedCity && savedKey) void search(savedCity, savedKey);
    // Saved settings are loaded once; subsequent searches are user-initiated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(cityInput, apiKey);
  }

  function handleSaveApiKey() {
    const normalizedKey = apiKey.trim();
    if (!normalizedKey) {
      setError("Enter an OpenWeather API key before saving it.");
      return;
    }
    localStorage.setItem("apiKey", normalizedKey);
    setApiKey(normalizedKey);
    setError(null);
    setNotice("API key saved in this browser.");
  }

  return (
    <div className="Weather">
      <form
        onSubmit={handleSubmit}
        className="dw-conditions-form dw-weather-form"
      >
        <label>
          <span>City</span>
          <input
            type="search"
            value={cityInput}
            placeholder={t("cCloudsCityInput")}
            autoComplete="address-level2"
            onChange={(event) => setCityInput(event.target.value)}
          />
        </label>
        <label>
          <span>OpenWeather API key</span>
          <input
            type="password"
            value={apiKey}
            placeholder={t("cCloudsApiKeyInput")}
            autoComplete="off"
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>
        <div className="dw-action-row">
          <button type="submit" className="dw-button" disabled={isLoading}>
            <i className="bi bi-search" aria-hidden="true" />
            {isLoading ? "Loading…" : t("cCloudsSearch")}
          </button>
          <button
            type="button"
            onClick={handleSaveApiKey}
            className="dw-button is-secondary"
          >
            {t("cCloudsSaveAPIKey")}
          </button>
        </div>
      </form>
      <p className="dw-weather-key-hint">
        Your key is stored only in this browser when you choose Save API key.
      </p>
      {error && (
        <div className="dw-weather-message is-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="dw-weather-message" role="status">
          {notice}
        </div>
      )}
      {weatherData ? (
        <div className="dw-weather-results" aria-busy={isLoading}>
          <WeatherInfo infoData={weatherData} />
          <WeatherForecast infoData={weatherData} />
        </div>
      ) : (
        <div className="dw-inline-empty">
          <i className="bi bi-cloud-moon" aria-hidden="true" />
          <h2>{isLoading ? "Loading forecast" : "Add your forecast source"}</h2>
          <p>
            {isLoading
              ? "Fetching observing conditions…"
              : "Enter a city and OpenWeather API key to see the next five days."}
          </p>
        </div>
      )}
    </div>
  );
}

export default Weather;
