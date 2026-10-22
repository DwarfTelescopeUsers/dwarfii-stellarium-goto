import React from "react";
import { usePhotoMediaCatalog } from "./usePhotoMediaCatalog";
import type { Dispatch, SetStateAction } from "react";

type PropTypes = {
  intervalIndexValue: number;
  setIntervalIndexValue: Dispatch<SetStateAction<number>>;
  totalTimeIndexValue: number;
  setTotalTimeIndexValue: Dispatch<SetStateAction<number>>;
  setShowSettingsMenu: Dispatch<SetStateAction<boolean>>;
};

export default function CameraTimeLapseSettings({
  intervalIndexValue,
  setIntervalIndexValue,
  totalTimeIndexValue,
  setTotalTimeIndexValue,
  setShowSettingsMenu,
}: PropTypes) {
  const { catalog, error } = usePhotoMediaCatalog();
  const interval = catalog?.sharedParameters?.find(
    (parameter) => parameter.key === "timelapseIntervalTime",
  );
  const duration = catalog?.sharedParameters?.find(
    (parameter) => parameter.key === "timelapseTotalTime",
  );
  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {!catalog && !error && (
        <p role="status">Loading device capture settings?</p>
      )}
      <label htmlFor="timelapse-interval">Interval (seconds)</label>
      <select
        id="timelapse-interval"
        value={intervalIndexValue}
        onChange={(event) => setIntervalIndexValue(Number(event.target.value))}
        disabled={!interval?.options?.length}
      >
        {interval?.options?.map((option) => (
          <option key={String(option.value)} value={Number(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
      <label htmlFor="timelapse-duration">Duration (seconds)</label>
      <select
        id="timelapse-duration"
        value={totalTimeIndexValue}
        onChange={(event) => setTotalTimeIndexValue(Number(event.target.value))}
        disabled={!duration?.options?.length}
      >
        {duration?.options?.map((option) => (
          <option key={String(option.value)} value={Number(option.value)}>
            {option.value === 0 ? "Device default (0)" : option.label}
          </option>
        ))}
      </select>
      {catalog && (!interval || !duration) && (
        <p role="status">
          The device did not advertise time-lapse configuration.
        </p>
      )}
      <button
        type="button"
        onClick={() => setShowSettingsMenu(false)}
        className="btn btn-more02"
      >
        Close
      </button>
    </div>
  );
}
