import { useContext, useState } from "react";
import type { ChangeEvent } from "react";

import { getCoordinates } from "@/lib/geolocation";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { saveLatitudeDB, saveLongitudeDB } from "@/db/db_utils";

export default function SetLocation() {
  let connectionCtx = useContext(ConnectionContext);
  const [errors, setErrors] = useState<string | undefined>();

  function browserCoordinatesHandler() {
    console.log("start getCoordinates...");
    getCoordinates(
      (position) => {
        let coords = position.coords;
        console.log("getCoordinates:", coords);
        saveLatitudeDB(coords.latitude);
        saveLongitudeDB(coords.longitude);
        connectionCtx.setLatitude(coords.latitude);
        connectionCtx.setLongitude(coords.longitude);
      },
      (err) => {
        console.log("getCoordinates err:", err);
        setErrors("Could not detect location.");
      }
    );
  }

  function latitudeHandler(e: ChangeEvent<HTMLInputElement>) {
    setErrors(undefined);

    let value = e.target.value.trim();
    if (value === "") return;

    if (/^-?\d*(\.\d+)?$/.test(value)) {
      saveLatitudeDB(Number(value));
      connectionCtx.setLatitude(Number(value));
    }
  }

  function longitudeHandler(e: ChangeEvent<HTMLInputElement>) {
    setErrors(undefined);

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

      <form>
        <div className="row mb-3">
          <div className="col-lg-1 col-md-2">
            <label htmlFor="latitude" className="form-label">
              Latitude
            </label>
          </div>
          <div className="col-lg-11 col-md-10">
            <input
              pattern="^-?\d*(\.\d+)?$"
              className="form-control"
              id="latitude"
              name="latitude"
              placeholder="-12.3456"
              required
              value={connectionCtx.latitude || ""}
              onChange={(e) => latitudeHandler(e)}
            />
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-lg-1 col-md-2">
            <label htmlFor="longitude" className="form-label">
              Longitude
            </label>
          </div>
          <div className="col-lg-11 col-md-10">
            <input
              pattern="^-?\d*(\.\d+)?$"
              className="form-control"
              id="longitude"
              name="longitude"
              placeholder="56.7890"
              required
              value={connectionCtx.longitude || ""}
              onChange={(e) => longitudeHandler(e)}
            />
          </div>
        </div>
      </form>

      <button className="btn btn-primary" onClick={browserCoordinatesHandler}>
        Use Current Location
      </button>
      {errors && <p className="text-danger">{errors}</p>}
    </>
  );
}
