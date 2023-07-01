import { useState, useContext, useEffect } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { AstroObject } from "@/types";
import {
  renderLocalRiseSetTime,
  computeRaDecToAltAz,
  convertAzToCardinal,
} from "@/lib/astro_utils";
import { centerHandler, startGotoHandler } from "@/lib/goto_utils";
import eventBus from "@/lib/event_bus";
import {
  convertHMSToDecimalDegrees,
  convertDMSToDecimalDegrees,
} from "@/lib/math_utils";

type AstronomyObjectPropType = {
  object: AstroObject;
};

export default function DSOObject(props: AstronomyObjectPropType) {
  const { object } = props;

  let connectionCtx = useContext(ConnectionContext);
  const [errors, setErrors] = useState<string | undefined>();

  useEffect(() => {
    eventBus.on("clearErrors", () => {
      setErrors(undefined);
    });
  }, []);

  let raDecimal: undefined | number;
  let decDecimal: undefined | number;
  if (object.ra) {
    raDecimal = convertHMSToDecimalDegrees(object.ra);
  }
  if (object.dec) {
    decDecimal = convertDMSToDecimalDegrees(object.dec);
  }

  function renderRiseSetTime(object: AstroObject) {
    if (connectionCtx.latitude && connectionCtx.longitude) {
      let times = renderLocalRiseSetTime(
        object,
        connectionCtx.latitude,
        connectionCtx.longitude
      );

      if (times?.error) {
        return <span>{times.error}</span>;
      }

      if (times) {
        return (
          <span>
            Rises: {times.rise}, Sets: {times.set}
          </span>
        );
      }
    }
  }

  function renderAltAz() {
    if (
      connectionCtx.latitude &&
      connectionCtx.longitude &&
      raDecimal &&
      decDecimal
    ) {
      let results = computeRaDecToAltAz(
        connectionCtx.latitude,
        connectionCtx.longitude,
        raDecimal,
        decDecimal,
        new Date()
      );

      if (results) {
        return (
          <span>
            Alt: {results.alt.toFixed(0)}°, Az: {results.az.toFixed(0)}°{" "}
            {convertAzToCardinal(results.az)}
          </span>
        );
      }
    }
  }

  function renderRADec() {
    if (
      connectionCtx.latitude &&
      connectionCtx.longitude &&
      object.ra &&
      object.dec
    ) {
      return (
        <span>
          RA: {object.ra}, Dec: {object.dec}
        </span>
      );
    }
  }

  return (
    <div className="border-bottom p-2">
      <h3 className="fs-5 mb-0">{object.displayName}</h3>
      <div className="mb-2">{object.alternateNames}</div>
      <div className="row">
        <div className="col-md-4">
          {object.type} {object.constellation && " in " + object.constellation}
          <br />
          Size: {object.size}
          <br />
          Magnitude: {object.magnitude}
        </div>
        <div className="col-md-5">
          {renderRiseSetTime(object)}
          <br></br>
          {renderAltAz()}
          <br></br>
          {renderRADec()}
        </div>
        <div className="col-md-3">
          <button
            className={`btn ${
              connectionCtx.connectionStatusStellarium
                ? "btn-primary"
                : "btn-secondary"
            } me-2 mb-2`}
            onClick={() => centerHandler(object, connectionCtx, setErrors)}
            disabled={!connectionCtx.connectionStatusStellarium}
          >
            Center
          </button>
          <button
            className={`btn ${
              connectionCtx.connectionStatus ? "btn-primary" : "btn-secondary"
            } mb-2`}
            onClick={() =>
              startGotoHandler(connectionCtx, setErrors, object.ra, object.dec)
            }
            disabled={!connectionCtx.connectionStatus}
          >
            Goto
          </button>
          <br />
          {errors && <span className="text-danger">{errors}</span>}
        </div>
      </div>
    </div>
  );
}
