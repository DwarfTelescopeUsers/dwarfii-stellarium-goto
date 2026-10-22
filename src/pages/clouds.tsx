import React, { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { getProxyUrl } from "@/lib/get_proxy_url";
import CustomChart from "@/components/clouds/Chart";
import Daypicker from "@/components/clouds/Daypicker";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import PageHeader from "@/components/shared/PageHeader";

const Clouds = () => {
  const [forecastTimes, setForecastTimes] = useState<string[]>([]);
  const [cloudArray, setCloudArray] = useState<string[]>([]);
  const [humidityArray, setHumidityArray] = useState<number[]>([]);
  const [windArray, setWindArray] = useState<number[]>([]);
  const [apiKey, setApiKey] = useState(
    typeof window !== "undefined" ? localStorage.getItem("apiKey") || "" : "",
  );
  const [city, setCity] = useState(
    typeof window !== "undefined" ? localStorage.getItem("city") || "" : "",
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string>("");

  let connectionCtx = useContext(ConnectionContext);

  const fetchForecast = useCallback(
    async (requestedCity: string, requestedDate: Date) => {
      const normalizedCity = requestedCity.trim();
      setError(null);
      setNotice("");

      if (!normalizedCity) {
        setError("Enter a city before loading the forecast.");
        return;
      }
      if (!apiKey.trim()) {
        setError("Enter your OpenWeather API key before loading the forecast.");
        return;
      }

      setIsLoading(true);
      try {
        const targetUrl = new URL(
          "https://api.openweathermap.org/data/2.5/forecast",
        );
        targetUrl.searchParams.set("q", normalizedCity);
        targetUrl.searchParams.set("appid", apiKey.trim());
        targetUrl.searchParams.set("units", "metric");

        const proxyUrl = getProxyUrl(connectionCtx);
        const apiUrl = connectionCtx.proxyIP
          ? `${proxyUrl}?target=${encodeURIComponent(targetUrl.href)}`
          : targetUrl.href;
        const response = await axios.get(apiUrl);

        const observingStart = new Date(requestedDate);
        observingStart.setHours(18, 0, 0, 0);
        const observingEnd = new Date(observingStart);
        observingEnd.setHours(observingEnd.getHours() + 15);

        const weatherTonight = response.data.list.filter((entry) => {
          const timestamp = entry.dt * 1000;
          return (
            timestamp >= observingStart.getTime() &&
            timestamp <= observingEnd.getTime()
          );
        });

        setForecastTimes(
          weatherTonight.map((entry) => entry.dt_txt.substring(11, 16)),
        );
        setCloudArray(weatherTonight.map((entry) => entry.clouds.all));
        setHumidityArray(weatherTonight.map((entry) => entry.main.humidity));
        setWindArray(weatherTonight.map((entry) => entry.wind.speed));
        setCity(normalizedCity);
        localStorage.setItem("city", normalizedCity);

        if (weatherTonight.length === 0) {
          setNotice("No forecast intervals are available for this date.");
        }
      } catch (requestError: any) {
        const status = requestError.response?.status;
        if (status === 401) {
          setError("OpenWeather rejected the API key. Check it and try again.");
        } else if (status === 404) {
          setError("City not found. Check the spelling and try again.");
        } else if (status === 429) {
          setError(
            "OpenWeather request limit reached. Please try again later.",
          );
        } else {
          setError("The cloud forecast could not be loaded. Please try again.");
          console.error("Cloud forecast request failed:", requestError);
        }
        setForecastTimes([]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey, connectionCtx],
  );

  useEffect(() => {
    setIsClient(true);
    if (city && apiKey) void fetchForecast(city, selectedDate);
    // Saved values should be loaded once when this page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setError(null);
    setNotice("");
  };

  const handleApiKeySave = (e: React.FormEvent<HTMLButtonElement>) => {
    e.preventDefault();
    localStorage.setItem("apiKey", apiKey);
    setError(null);
    setNotice("API key saved on this device.");
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void fetchForecast(city, selectedDate);
  };

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    setError(null);
    setNotice("");
  };
  const { t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    }
  }, []);

  return (
    <>
      {isClient && (
        <div className="dw-page">
          <PageHeader
            eyebrow="Conditions"
            title="Cloud forecast"
            description="Compare cloud cover, humidity and wind across the observing window."
          />
          <section className="dw-panel dw-conditions-panel">
            <form
              className="dw-conditions-form is-clouds"
              onSubmit={handleSearch}
            >
              <label>
                <span>City</span>
                <input
                  type="search"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder={t("cCloudsCityInput")}
                  className="form-control-weather"
                  autoComplete="address-level2"
                />
              </label>
              <label>
                <span>OpenWeather API key</span>
                <input
                  type="password"
                  value={apiKey}
                  placeholder={t("cCloudsApiKeyInput")}
                  className="form-control-weather"
                  onChange={handleApiKeyChange}
                  autoComplete="off"
                />
              </label>
              <Daypicker
                selectedDate={selectedDate}
                setSelectedDate={handleDateChange}
              />
              <div className="dw-action-row">
                <button
                  type="submit"
                  className="dw-button"
                  disabled={isLoading}
                >
                  {isLoading ? "Loading forecast…" : t("cCloudsSearch")}
                </button>
                <button
                  type="button"
                  className="dw-button is-secondary"
                  onClick={handleApiKeySave}
                >
                  {t("cCloudsSaveAPIKey")}
                </button>
              </div>
            </form>
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="alert alert-info" role="status">
                {notice}
              </div>
            )}
            {isLoading ? (
              <div className="dw-inline-empty" role="status">
                <i className="bi bi-cloud-arrow-down" aria-hidden="true" />
                <h2>Loading cloud forecast</h2>
                <p>Checking the selected observing window for {city}.</p>
              </div>
            ) : forecastTimes.length > 0 ? (
              <CustomChart
                forecastTimes={forecastTimes}
                cloudArray={cloudArray}
                humidityArray={humidityArray.map(String)}
                windArray={windArray.map(String)}
              />
            ) : (
              <div className="dw-inline-empty">
                <i className="bi bi-clouds" aria-hidden="true" />
                <h2>No forecast loaded</h2>
                <p>Enter a city and API key to see tonight’s cloud outlook.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
};

export default Clouds;
