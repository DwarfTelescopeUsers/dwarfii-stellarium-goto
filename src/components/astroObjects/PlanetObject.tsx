import React, { useState, useContext, useEffect } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { ObservationObject } from "@/types";
import { renderLocalRiseSetTime } from "@/lib/astro_utils";
import { centerHandler, centerGotoHandler } from "@/lib/goto_utils";
import eventBus from "@/lib/event_bus";

type AstronomyObjectPropType = {
  object: ObservationObject;
};

export default function PlanetObject(props: AstronomyObjectPropType) {
  const { object } = props;

  let connectionCtx = useContext(ConnectionContext);
  const [errors, setErrors] = useState<string | undefined>();

  useEffect(() => {
    eventBus.on("clearErrors", () => {
      setErrors(undefined);
    });
  }, []);

  function renderRiseSetTime(object: ObservationObject) {
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

  return (
    <tr>
      <td>{object.displayName}</td>
      <td>
        {/* {JSON.stringify(object)} */}
        Average magnitude: {object.magnitude}
        <br />
        {renderRiseSetTime(object)}
      </td>
      <td>
        <button
          className="btn btn-primary me-2 mb-2"
          onClick={() => centerHandler(object, connectionCtx, setErrors)}
        >
          Center
        </button>
        <button
          className="btn btn-primary mb-2"
          onClick={() => centerGotoHandler(object, connectionCtx, setErrors)}
        >
          Goto
        </button>
        <br />
        {errors && <span className="text-danger">{errors}</span>}
      </td>
    </tr>
  );
}
