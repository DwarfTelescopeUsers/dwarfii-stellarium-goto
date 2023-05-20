import { useContext } from "react";
import type { ChangeEvent } from "react";

import { getCoordinates } from "@/lib/geolocation";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { saveLatitudeDB, saveLongitudeDB } from "@/db/db_utils";

export default function SetLocation() {
  let connectionCtx = useContext(ConnectionContext);

  function browserCoordinatesHandler() {
    getCoordinates((coords) => {
      saveLatitudeDB(coords.latitude);
      saveLongitudeDB(coords.longitude);
      connectionCtx.setLatitude(coords.latitude);
      connectionCtx.setLongitude(coords.longitude);
    });
  }

  function latitudeHandler(e: ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.trim();
    if (value === "") return;

    if (/^-?\d*(\.\d+)?$/.test(value)) {
      saveLatitudeDB(Number(value));
      connectionCtx.setLatitude(Number(value));
    }
  }

  function longitudeHandler(e: ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.trim();
    if (value === "") return;

    if (/^-?\d*(\.\d+)?$/.test(value)) {
      saveLongitudeDB(Number(value));
      connectionCtx.setLongitude(Number(value));
    }
  }

  return (
    <>
      <h2>Set Location</h2>
      <p>
        In order for goto to work, this site needs your latitude and longitude.
      </p>

      <p>
        Latitude: {connectionCtx.latitude}
        <br />
        Longitude: {connectionCtx.longitude}
      </p>

      <h3>Option 1</h3>
      <p>Allow website to access your location.</p>
      <button className="btn btn-primary" onClick={browserCoordinatesHandler}>
        Allow
      </button>
      <h3 className="mt-3">Option 2</h3>
      <p>Enter in your coordinates.</p>
      <form>
        <div className="row mb-3">
          <div className="col">
            <label htmlFor="latitude" className="form-label">
              Latitude
            </label>
            <input
              pattern="^-?\d*(\.\d+)?$"
              className="form-control"
              id="latitude"
              name="latitude"
              placeholder="-12.3456"
              required
              value={connectionCtx.latitude}
              onChange={(e) => latitudeHandler(e)}
            />
          </div>

          <div className="col">
            <label htmlFor="longitude" className="form-label">
              Longitude
            </label>
            <input
              pattern="^-?\d*(\.\d+)?$"
              className="form-control"
              id="longitude"
              name="longitude"
              placeholder="56.7890"
              required
              value={connectionCtx.longitude}
              onChange={(e) => longitudeHandler(e)}
            />
          </div>
        </div>
      </form>
    </>
  );
}
