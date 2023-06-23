import type { Dispatch, SetStateAction } from "react";

import { ObservationObject, ConnectionContextType } from "@/types";
import { focusPath, objectInfoPath } from "@/lib/stellarium_utils";
import { wsURL, startGoto, startGotoCmd, socketSend } from "@/lib/dwarfii_api";
import eventBus from "@/lib/event_bus";

export function startGotoHandler(
  connectionCtx: ConnectionContextType,
  setGotoErrors: Dispatch<SetStateAction<string | undefined>>,
  RA: number | undefined,
  declination: number | undefined
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }

  setGotoErrors(undefined);

  let lat = connectionCtx.latitude;
  let lon = connectionCtx.longitude;
  console.log(RA, declination, lat, lon);
  if (RA === undefined) return;
  if (declination === undefined) return;
  if (lat === undefined) return;
  if (lon === undefined) return;

  const socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
  socket.addEventListener("open", () => {
    console.log("start startGoto...");
    let planet = null;
    let options = startGoto(
      planet,
      RA,
      declination,
      lat as number,
      lon as number
    );
    socketSend(socket, options);
  });

  socket.addEventListener("message", (event) => {
    let message = JSON.parse(event.data);
    if (message.interface === startGotoCmd) {
      if (message.code === -45) {
        setGotoErrors("GOTO target below the horizon");
      }
      if (message.code === -18) {
        setGotoErrors("Plate Solving failed");
      }
      console.log("startGoto:", message.code, message);
    } else {
      console.log(message);
    }
  });

  socket.addEventListener("error", (message) => {
    console.log("startGoto error:", message);
  });
}

export function stellariumErrorHandler(
  err: any,
  setErrors: Dispatch<SetStateAction<string | undefined>>
) {
  if (
    err.name === "AbortError" ||
    err.message === "Failed to fetch" ||
    err.message === "Load failed"
  ) {
    setErrors("Can not connect to Stellarium");
  } else if (err.message === "StellariumError") {
    setErrors(err.cause);
  } else {
    setErrors(`Error processing Stellarium data>> ${err}`);
  }
}

export function centerHandler(
  object: ObservationObject,
  connectionCtx: ConnectionContextType,
  setErrors: Dispatch<SetStateAction<string | undefined>>
) {
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
      .catch((err) => stellariumErrorHandler(err, setErrors));
  } else {
    setErrors("App is not connect to Stellarium.");
  }
}

export function centerGotoHandler(
  object: ObservationObject,
  connectionCtx: ConnectionContextType,
  setErrors: Dispatch<SetStateAction<string | undefined>>
) {
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
      .catch((err) => stellariumErrorHandler(err, setErrors));
  } else {
    setErrors("App is not connect to Stellarium.");
  }
}
