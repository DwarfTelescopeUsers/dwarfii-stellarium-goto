import React, { useState, useEffect, useRef } from "react";
import MoonPhaseCalculator from "../components/MoonPhaseCalculator";
import { useTranslation } from "react-i18next";
//import i18n from "@/i18n";
import SunCalc from "suncalc";
import PageHeader from "@/components/shared/PageHeader";
import { useRouter } from "next/router";

export default function Moonphase() {
  const router = useRouter();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${currentMonth}`,
  );
  const { t } = useTranslation();
  const [city, setCity] = useState(
    typeof window !== "undefined" ? localStorage.getItem("city") || "" : "",
  );
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [timeZone, setTimeZone] = useState<string>();
  const [locationName, setLocationName] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const searchId = useRef(0);

  useEffect(() => {
    if (!router.isReady) return;
    const {
      latitude: lat,
      longitude: lon,
      timezone,
      location,
      month,
    } = router.query;
    if (
      typeof lat === "string" &&
      typeof lon === "string" &&
      lat.trim() &&
      lon.trim() &&
      Number.isFinite(Number(lat)) &&
      Math.abs(Number(lat)) <= 90 &&
      Number.isFinite(Number(lon)) &&
      Math.abs(Number(lon)) <= 180 &&
      typeof timezone === "string" &&
      typeof location === "string"
    ) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
        searchId.current++;
        setLatitude(Number(lat));
        setLongitude(Number(lon));
        setTimeZone(timezone);
        setLocationName(location);
        setCity(location);
        setSearching(false);
        setError("");
        if (typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month))
          setSelectedMonth(month);
        return;
      } catch {
        /* Invalid links fall back to the saved city. */
      }
    }
    if (city) void fetchCoordinates(city);
  }, [router.isReady, router.asPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve city coordinates without requiring a weather API key.
  const fetchCoordinates = async (cityName: string) => {
    const requestId = ++searchId.current;
    const query = cityName.trim();
    if (!query) {
      setError("Enter a city to build the lunar calendar.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: "10", language: "de", format: "json" })}`,
      );
      if (!response.ok)
        throw new Error("Location search is unavailable. Try again shortly.");
      const data = await response.json();
      if (requestId !== searchId.current) return;
      const location =
        data.results?.find(
          (item: { name: string }) =>
            item.name.toLocaleLowerCase("de") === query.toLocaleLowerCase("de"),
        ) ?? data.results?.[0];
      if (
        !location ||
        !Number.isFinite(location.latitude) ||
        !Number.isFinite(location.longitude)
      ) {
        throw new Error(
          `No location found for “${query}”. Try adding a region or country.`,
        );
      }
      setLatitude(location.latitude);
      setLongitude(location.longitude);
      setTimeZone(location.timezone);
      setLocationName(
        [location.name, location.admin1, location.country]
          .filter(Boolean)
          .join(", "),
      );
      localStorage.setItem("city", location.name);
    } catch (failure) {
      if (requestId !== searchId.current) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not find this city.",
      );
    } finally {
      if (requestId === searchId.current) setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void fetchCoordinates(city);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(event.target.value);
  };

  const renderMoonPhasesTable = () => {
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const daysCount = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
    const moonPhasesTable: React.ReactNode[] = [];

    let currentDay = 1;

    for (
      let row = 0;
      row < Math.ceil((firstDayOfMonth + daysCount) / 7);
      row++
    ) {
      const rowData: React.JSX.Element[] = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        if (row === 0 && dayOfWeek < firstDayOfMonth) {
          rowData.push(<td key={`empty-${row}-${dayOfWeek}`}></td>);
        } else if (currentDay <= daysCount) {
          const date = new Date(year, month - 1, currentDay);
          const phase = <MoonPhaseCalculator date={date} />;

          // Maanopgang en ondergang berekenen
          const moonTimes = SunCalc.getMoonTimes(date, latitude, longitude);
          // Function to format the date as a string
          const formatDate = (date: Date | null): string => {
            if (!date) return "-";

            return new Intl.DateTimeFormat(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              timeZone,
            }).format(date);
          };
          const moonrise = formatDate(moonTimes.rise);
          const moonset = formatDate(moonTimes.set);

          // Maanzichtbaarheid en afstand tot aarde
          const moonIllumination =
            SunCalc.getMoonIllumination(date).fraction * 100;
          const moonDistance = SunCalc.getMoonPosition(
            date,
            latitude,
            longitude,
          ).distance.toFixed(0);

          rowData.push(
            <td
              key={`day-${year}-${month}-${currentDay}`}
              className="moon-cell"
            >
              <div className="moon-phase">
                <time
                  dateTime={`${year}-${monthStr}-${String(currentDay).padStart(2, "0")}`}
                >
                  {currentDay}
                </time>
                {phase}
                <dl className="moon-times">
                  <div>
                    <dt>{t("pMoonphaseMoonrise")}</dt>
                    <dd>{moonrise}</dd>
                  </div>
                  <div>
                    <dt>{t("pMoonphaseMoonset")}</dt>
                    <dd>{moonset}</dd>
                  </div>
                  <div>
                    <dt>{t("pMoonphaseVisibility")}</dt>
                    <dd>{moonIllumination.toFixed(0)}%</dd>
                  </div>
                  <div>
                    <dt>{t("pMoonphaseDistance")}</dt>
                    <dd>{moonDistance} km</dd>
                  </div>
                </dl>
              </div>
            </td>,
          );
          currentDay++;
        } else {
          rowData.push(<td key={`empty-${row}-${dayOfWeek}`}></td>);
        }
      }
      if (rowData.length > 0) {
        moonPhasesTable.push(<tr key={`row-${row}`}>{rowData}</tr>);
      }
    }

    return moonPhasesTable;
  };

  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Conditions"
        title="Moon planner"
        description="Review illumination, rise and set times, and lunar distance for each night."
      />
      <section className="dw-panel dw-moon-panel">
        {/* Flex-container voor stad en maand selectie */}
        <div className="input-container dw-conditions-form">
          {/* Stad invoerveld + zoekknop */}
          <form className="city-input" onSubmit={handleSearch}>
            <label htmlFor="city">{t("pMoonphaseSelectCity")}</label>
            <div className="city-search-box">
              <input
                type="text"
                id="city"
                value={city}
                placeholder={t("cCloudsCityInput")}
                onChange={(event) => {
                  searchId.current++;
                  setCity(event.target.value);
                }}
              />
              <button type="submit" disabled={searching}>
                {searching ? "Searching…" : t("pMoonphaseSearch")}
              </button>
            </div>
          </form>

          {/* Maand selecteren */}
          <div className="month-input">
            <label htmlFor="start">{t("pMoonphaseSelectMonth")}</label>
            <input
              type="month"
              id="start"
              name="start"
              min="2024-01"
              value={selectedMonth}
              onChange={handleChange}
            />
          </div>
        </div>
        {error && (
          <div className="dw-inline-message is-error" role="alert">
            {error}
          </div>
        )}
        {locationName && !error && (
          <p className="dw-muted" role="status">
            Showing lunar times for {locationName} ({timeZone}). Location data
            by Open-Meteo.
          </p>
        )}

        {/* Kalender */}
        <div className="calendar dw-calendar-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("cMoonDaySun")}</th>
                <th>{t("cMoonDayMon")}</th>
                <th>{t("cMoonDayTue")}</th>
                <th>{t("cMoonDayWed")}</th>
                <th>{t("cMoonDayThu")}</th>
                <th>{t("cMoonDayFri")}</th>
                <th>{t("cMoonDaySat")}</th>
              </tr>
            </thead>
            <tbody>
              {latitude !== null && longitude !== null
                ? renderMoonPhasesTable()
                : null}
            </tbody>
          </table>
        </div>
        {(latitude === null || longitude === null) && (
          <div className="dw-inline-empty">
            <i className="bi bi-moon-stars" aria-hidden="true" />
            <h2>Choose a city to build the lunar calendar</h2>
            <p>
              Search for a city to see moonrise, moonset and illumination. No
              weather API key is required.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
