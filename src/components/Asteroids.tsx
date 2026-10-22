import { useGetAsteroidsMutation } from "@/components/asteroids/api/api"; // Adjust the path as needed
import { ApiNasaResponse } from "@/components/asteroids/api/types";
import { useLocalStorage } from "@/components/asteroids/functions/hooks";
import { NextPage } from "next";
import React, { useState, useContext, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

import Asteroid from "@/components/asteroids/asteroid";
import Counter from "@/components/asteroids/counter";

type PropType = {
  setModule: Dispatch<SetStateAction<string | undefined>>;
  setErrors: Dispatch<SetStateAction<string | undefined>>;
  setSuccess: Dispatch<SetStateAction<string | undefined>>;
};

const MainPage: NextPage<PropType> = ({ setModule, setErrors, setSuccess }) => {
  const currentDate = new Date().toISOString().split("T")[0];
  const [localStorageData, setLocalStorageData] = useLocalStorage(
    "asteroids",
    "",
  );
  let connectionCtx = useContext(ConnectionContext);
  const [NasaApiKey, setNasaApiKey] = useLocalStorage("NasaApiKey", ""); // Store NasaApiKey in local storage
  const [getAsteroids, { data, isLoading }] = useGetAsteroidsMutation(); // Using the hook directly
  const [inputNasaApiKey, setInputNasaApiKey] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Parse the local storage data or initialize it as an empty object
  const asteroidsData: ApiNasaResponse = React.useMemo(
    () => (localStorageData ? JSON.parse(localStorageData) : {}),
    [localStorageData],
  );

  const { t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    setModule("Asteroids");
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    }
  }, []);

  // Fetch asteroids data if not available in local storage for the current date
  useEffect(() => {
    if (NasaApiKey && !asteroidsData?.near_earth_objects?.[currentDate]) {
      getAsteroids(currentDate);
    }
    if (!initialized && NasaApiKey) {
      setInputNasaApiKey(NasaApiKey);
      setInitialized(true);
    }
  }, [NasaApiKey, initialized, asteroidsData, currentDate, getAsteroids]);

  // Update local storage when new data is fetched
  useEffect(() => {
    if (data) {
      setLocalStorageData(JSON.stringify(data));
    }
  }, [data, setLocalStorageData]);

  // Handler to save NasaApiKey to local storage
  const handleSaveNasaApiKey = () => {
    const apiKey = inputNasaApiKey.trim();
    if (!apiKey) {
      setErrors("Enter a NASA API key before saving.");
      return;
    }
    setErrors(undefined);
    setNasaApiKey(apiKey);
  };

  // Handler to load objects (trigger API call)
  const handleLoadObjects = () => {
    if (NasaApiKey) {
      getAsteroids(currentDate);
    } else {
      setErrors("Save a NASA API key before loading asteroid data.");
    }
  };

  return (
    <div className="dw-asteroid-browser">
      <div className="dw-target-notices" aria-live="polite">
        {!connectionCtx.connectionStatusStellarium && (
          <div className="dw-target-notice is-warning">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            <span>{t("cGoToAsteroidConnectStellarium")}</span>
          </div>
        )}
        {!connectionCtx.connectionStatus && (
          <div className="dw-target-notice is-warning">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            <span>
              {t("cGoToListConnectDwarf", {
                DwarfType: connectionCtx.typeNameDwarf,
              })}
            </span>
          </div>
        )}
      </div>
      <section className="dw-asteroid-api-panel">
        <div>
          <h2>Near-Earth asteroids</h2>
          <p>
            Load today&apos;s close approaches from NASA. Your API key is stored
            only in this browser.
          </p>
        </div>
        <label htmlFor="nasa-api-key">NASA API key</label>
        <div className="dw-asteroid-api-controls">
          <input
            id="nasa-api-key"
            type="password"
            value={inputNasaApiKey}
            onChange={(e) => setInputNasaApiKey(e.target.value)}
            placeholder="Enter your API key"
            autoComplete="off"
          />
          <button
            type="button"
            className="dw-target-action is-secondary"
            onClick={handleSaveNasaApiKey}
          >
            Save key
          </button>
          <button
            type="button"
            className="dw-target-action"
            onClick={handleLoadObjects}
            disabled={!NasaApiKey || isLoading}
          >
            {isLoading ? "Loading…" : "Load asteroids"}
          </button>
        </div>
      </section>

      <div className="dw-asteroid-summary">
        <div>
          <span>Approach date</span>
          <strong>{currentDate}</strong>
        </div>
        <Counter
          total={asteroidsData?.element_count}
          dangerous={
            asteroidsData?.near_earth_objects?.[currentDate]?.filter(
              (asteroid) => asteroid.is_potentially_hazardous_asteroid,
            )?.length
          }
        />
      </div>

      {isLoading && (
        <div className="dw-target-loading" role="status">
          <span
            className="spinner-border spinner-border-sm"
            aria-hidden="true"
          />
          Looking for asteroids approaching Earth…
        </div>
      )}
      {!isLoading && !asteroidsData?.near_earth_objects?.[currentDate] && (
        <div className="dw-target-empty">
          <i className="bi bi-stars" aria-hidden="true" />
          <h2>No asteroid data loaded</h2>
          <p>
            Save your NASA API key, then load today&apos;s close approaches.
          </p>
        </div>
      )}
      <div className="dw-asteroid-results">
        {asteroidsData?.near_earth_objects?.[currentDate]
          ?.sort(({ is_potentially_hazardous_asteroid }) =>
            is_potentially_hazardous_asteroid ? -1 : 1,
          )
          .map((data, index) => (
            <Asteroid
              key={index}
              data={data}
              setErrors={setErrors}
              setSuccess={setSuccess}
            />
          ))}
      </div>
    </div>
  );
};

export default MainPage;
