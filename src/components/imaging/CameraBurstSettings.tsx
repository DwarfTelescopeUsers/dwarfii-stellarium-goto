import React from "react";
import { usePhotoMediaCatalog } from "./usePhotoMediaCatalog";
import type { Dispatch, SetStateAction } from "react";

type PropTypes = {
  countValue: number;
  setCountValue: Dispatch<SetStateAction<number>>;
  intervalValue: number;
  setIntervalValue: Dispatch<SetStateAction<number>>;
  setShowSettingsMenu: Dispatch<SetStateAction<boolean>>;
};

export default function CameraBurstSettings({
  countValue,
  setCountValue,
  intervalValue,
  setIntervalValue,
  setShowSettingsMenu,
}: PropTypes) {
  const { catalog, error } = usePhotoMediaCatalog();
  const count = catalog?.sharedParameters?.find(
    (parameter) => parameter.key === "burstCount",
  );
  const interval = catalog?.sharedParameters?.find(
    (parameter) => parameter.key === "burstIntervalTime",
  );
  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {!catalog && !error && (
        <p role="status">Loading device capture settings?</p>
      )}
      <label htmlFor="burst-frame-count">Frame count</label>
      <input
        id="burst-frame-count"
        type="number"
        min={count?.range?.minimum}
        max={count?.range?.maximum}
        step={1}
        value={countValue}
        disabled={!count}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (Number.isSafeInteger(value) && value >= 1 && value <= 2147483647)
            setCountValue(value);
        }}
      />
      <label htmlFor="burst-interval">Interval (seconds)</label>
      <select
        id="burst-interval"
        value={intervalValue}
        onChange={(event) => setIntervalValue(Number(event.target.value))}
        disabled={!interval?.options?.length}
      >
        {interval?.options?.map((option) => (
          <option key={String(option.value)} value={Number(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
      {catalog && (!count || !interval) && (
        <p role="status">The device did not advertise burst configuration.</p>
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
