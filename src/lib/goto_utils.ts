import type { Dispatch, SetStateAction } from "react";

import { wsURL, startGoto, startGotoCmd, socketSend } from "@/lib/dwarfii_api";
import { ConnectionContextType } from "@/types";

export function startGotoHandler(
  connectionCtx: ConnectionContextType,
  setGotoErrors: Dispatch<SetStateAction<string | undefined>>,
  RA: number | undefined,
  declination: number | undefined
) {
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

export function errorHandler(
  err: any,
  setErrors: Dispatch<SetStateAction<string | undefined>>
) {
  if (err.name === "AbortError" || err.message === "Failed to fetch") {
    setErrors("Can not connect to Stellarium");
  } else if (err.message === "StellariumError") {
    setErrors(err.cause);
  } else {
    setErrors("Error processing Stellarium data");
  }
}
