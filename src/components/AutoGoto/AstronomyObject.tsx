import React, { useState, useContext } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { ObservationObject } from "@/types";
import { focusPath, objectInfoPath } from "@/lib/stellarium_utils";
import { startGotoHandler, errorHandler } from "@/lib/goto_utils";
import eventBus from "@/lib/event_bus";

type AstronomyObjectPropType = {
  object: ObservationObject;
};

export default function AstronomyObject(props: AstronomyObjectPropType) {
  const { object } = props;

  let connectionCtx = useContext(ConnectionContext);
  const [errors, setErrors] = useState<string | undefined>();

  useEffect(() => {
    eventBus.on("clearErrors", () => {
      setErrors(undefined);
    });
  }, []);

  function centerHandler(object: ObservationObject) {
    eventBus.dispatch("clearErrors", { message: "clear errors" });

    let url = connectionCtx.urlStellarium;
    if (url) {
      console.log("select object in stellarium...");

      let focusUrl = `${url}${focusPath}${object.designation}`;
      fetch(focusUrl, { method: "POST", signal: AbortSignal.timeout(2000) })
        .then((res) => res.json())
        .then((data) => {
          if (!data) {
            setErrors(`Coundpp not find object: ${object.designation}`);
            throw Error("foo");
          }
        })
        .catch((err) => errorHandler(err, setErrors));
    } else {
      setErrors("App is not connect to Stellarium.");
    }
  }

  function centerGotoHandler(object: ObservationObject) {
    eventBus.dispatch("clearErrors", { message: "clear errors" });

    let url = connectionCtx.urlStellarium;
    if (url) {
      console.log("select object in stellarium...");

      let focusUrl = `${url}${focusPath}${object.designation}`;
      fetch(focusUrl, { method: "POST", signal: AbortSignal.timeout(2000) })
        .then((res) => res.json())
        .then((data) => {
          if (!data) {
            throw Error(`StellariumError`, {
              cause: `Cound not find object: ${object.designation}`,
            });
          }
        })
        .then(() => {
          console.log("get RA & declination...");
          return fetch(`${url}${objectInfoPath}`, {
            signal: AbortSignal.timeout(2000),
          });
        })
        .then((response) => {
          if (!response.ok) {
            throw Error(`StellariumError`, {
              cause: "Error when connecting to Stellarium",
            });
          }

          return response.json();
        })
        .then((data) => {
          startGotoHandler(connectionCtx, setErrors, data.ra, data.dec);
        })
        .catch((err) => errorHandler(err, setErrors));
    } else {
      setErrors("App is not connect to Stellarium.");
    }
  }

  return (
    <tr>
      <td>
        {object.displayName}
        <br />
        {object.objtype}
      </td>
      <td>
        RA: {object.ra}
        <br /> Dec: {object.dec}
        <br />
        Magnitude: {object.magnitude}
      </td>
      <td>
        <button
          className="btn btn-primary"
          onClick={() => centerHandler(object)}
        >
          Center
        </button>
        <button
          className="btn btn-primary"
          onClick={() => centerGotoHandler(object)}
        >
          Goto
        </button>
        <br />
        {errors && <span className="text-danger">{errors}</span>}
      </td>
    </tr>
  );
}
