import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { getProxyUrl } from "@/lib/get_proxy_url";

interface WeatherData {
  hourly: {
    cloudcover: number[];
    temperature_2m: number[];
    windspeed_10m: number[];
    relative_humidity_2m: number[];
    dewpoint_2m: number[];
  };
}

const AstroWeather: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState("50.85,4.35"); // Default: Brussel

  const locations = {
    Amsterdam: "52.37,4.89",
    Brussel: "50.85,4.35",
    Berlijn: "52.52,13.41",
    Parijs: "48.85,2.35",
    Londen: "51.51,-0.13",
  };
  let connectionCtx = useContext(ConnectionContext);

  useEffect(() => {
    if (!selectedLocation) return;

    const [lat, lon] = selectedLocation.split(",");
    let apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=cloudcover,temperature_2m,windspeed_10m,relative_humidity_2m,dewpoint_2m&timezone=Europe/Brussels`;
    if (connectionCtx.proxyIP && getProxyUrl(connectionCtx)) {
      const targetUrl = new URL(apiUrl);
      apiUrl = `${getProxyUrl(connectionCtx)}?target=${encodeURIComponent(
        targetUrl.href,
      )}`;
    }

    axios
      .get(apiUrl)
      .then((response) => {
        setWeatherData(response.data as WeatherData);
      })
      .catch((error) => console.error("Fout bij laden weerdata:", error));
  }, [selectedLocation]);

  if (!weatherData) return <p>🌙 Laden van astronomisch weer...</p>;

  return (
    <div className="astro-weather">
      <h2 className="astro-title">Astronomisch Weer op uurbasis</h2>
      <label htmlFor="location-select">Kies een locatie:</label>
      <select
        id="location-select"
        value={selectedLocation}
        onChange={(e) => setSelectedLocation(e.target.value)}
      >
        {Object.entries(locations).map(([city, coords]) => (
          <option key={city} value={coords}>
            {city}
          </option>
        ))}
      </select>

      <div className="weather-info">
        <p>🌤️ Bewolking: {weatherData.hourly.cloudcover[0]}%</p>
        <p>🌡️ Temperatuur: {weatherData.hourly.temperature_2m[0]}°C</p>
        <p>💨 Windsnelheid: {weatherData.hourly.windspeed_10m[0]} km/h</p>
        <p>
          💧 Luchtvochtigheid: {weatherData.hourly.relative_humidity_2m[0]}%
        </p>
        <p>❄️ Dauwpunt: {weatherData.hourly.dewpoint_2m[0]}°C</p>
      </div>
    </div>
  );
};

export default AstroWeather;
