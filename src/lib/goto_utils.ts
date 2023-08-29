import type { Dispatch, SetStateAction } from "react";

import { AstroObject, ConnectionContextType } from "@/types";
import { focusPath } from "@/lib/stellarium_utils";
import { wsURL, calibrateGoto, calibrateGotoCmd, startGoto, startGotoCmd, formatUtcUrl, formatTimeZoneUrl } from "dwarfii_api";
import eventBus from "@/lib/event_bus";
import { logger } from "@/lib/logger";
import { convertHMSToDecimalHours, convertDMSToDecimalDegrees} from "@/lib/math_utils";

export async function setUTCTime(connectionCtx: ConnectionContextType) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  // BUG: date url only works if browser has no cors extension
  let dateUrl = formatUtcUrl(connectionCtx.IPDwarf);
  await fetch(dateUrl)
    .then((res) => {
      return res.json();
    })
    .then((data) => {
      if (data.result == 0) {
        logger("utc date ok", { "utc date ok": data.result }, connectionCtx);

        setTimeZoneUrl(connectionCtx);

      } else {
        logger(
          "utc date error",
          { "utc date error": data.result },
          connectionCtx
        );
      }
    })
    .catch((err) => console.log(err));
}

async function setTimeZoneUrl(connectionCtx: ConnectionContextType) {

    if (connectionCtx.IPDwarf === undefined) {
      return;
    }

    let timeZoneUrl = formatTimeZoneUrl(connectionCtx.IPDwarf);
    await fetch(timeZoneUrl)
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        if (data.result == 0) {
          logger("time zone ok", { "time zone ok": data.result }, connectionCtx);
      } else {
        logger(
          "time zone error",
          { "time zone error": data.result },
          connectionCtx
        );
      }
    })
    .catch((err) => console.log(err));
}

export async function calibrationHandler(
  connectionCtx: ConnectionContextType,
  setGotoErrors: Dispatch<SetStateAction<string | undefined>>,
  callback?: (options: any) => void // eslint-disable-line no-unused-vars
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  setGotoErrors(undefined);
  eventBus.dispatch("clearErrors", { message: "clear errors" });

  await setUTCTime(connectionCtx);
  let lat = connectionCtx.latitude;
  let lon = connectionCtx.longitude;
  if (lat === undefined) return;
  if (lon === undefined) return;
  
  const socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
  socket.addEventListener("open", () => {
    let options = calibrateGoto(
      lat as number,
      lon as number
    );

    // options.date = "2023-07-07 03:00:14";
    if (callback) {
      callback("calibrateGoto");
      callback(options);
    }

    logger("calibrateGoto...", options, connectionCtx);
    console.log("...", options);

    socket.send(JSON.stringify(options));
  });

  socket.addEventListener("message", (event) => {
    let message = JSON.parse(event.data);
    if (message.interface === calibrateGotoCmd) {
      if (message.code === -18) {
        setGotoErrors("Plate Solving failed");
        if (callback) {
          callback("Plate Solving failed");
        }
      } else if (message.code === 1001) {
        setGotoErrors("Correcting Plate Solving");
        if (callback) {
          callback("Correcting Plate Solving");
        }
      } else if (message.code === 1002) {
        setGotoErrors("Correction failure");
        if (callback) {
          callback("Correction failure");
        }
      } else if (message.code === 1000) {
        if (callback) {
          callback("Start coorection");
        }
      } else if (message.code === 1004) {
        if (callback) {
          callback("Start plate solving");
        }
      } else if (message.code === 1009) {
        if (callback) {
          callback("Correct Successfully");
        }
      }
      if (callback) {
        callback(message);
      }
      logger("calibrateGoto:", message, connectionCtx);
  
    } else {
      logger("", message, connectionCtx);
    }
  });

  socket.addEventListener("error", (message) => {
    if (callback) {
      callback(message);
    }
    logger("calibrateGoto error:", message, connectionCtx);
  });
}

export async function startGotoHandler(
  connectionCtx: ConnectionContextType,
  setGotoErrors: Dispatch<SetStateAction<string | undefined>>,
  planet: number | undefined | null,
  RA: string | undefined | null,
  declination: string | undefined | null,
  callback?: (options: any) => void // eslint-disable-line no-unused-vars
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  setGotoErrors(undefined);
  eventBus.dispatch("clearErrors", { message: "clear errors" });

  // await setUTCTime(connectionCtx); no need ?
  let lat = connectionCtx.latitude;
  let lon = connectionCtx.longitude;
  if (lat === undefined) return;
  if (lon === undefined) return;

  const socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
  socket.addEventListener("open", () => {
    let RA_number = RA ? convertHMSToDecimalHours(RA!) : 0;
    let declination_number = declination ? convertDMSToDecimalDegrees(declination!) : 0;
  
    let options = startGoto(
      planet,
      RA_number,
      declination_number,
      lat as number,
      lon as number
    );

    connectionCtx.astroSettings.rightAcension = RA!;
    connectionCtx.astroSettings.declination = declination!;

    // options.date = "2023-07-07 03:00:14";
    if (callback) {
      callback("Start goto");
      callback(options);
    }

    logger("start startGoto...", options, connectionCtx);
    console.log("...", options);

    socket.send(JSON.stringify(options));
  });

  socket.addEventListener("message", (event) => {
    let message = JSON.parse(event.data);
    if (message.interface === startGotoCmd) {
      if (message.code === -45) {
        setGotoErrors("Target below the horizon");
        if (callback) {
          callback("Target below the horizon");
        }
      } else if (message.code === -18) {
        setGotoErrors("Plate Solving failed");
        if (callback) {
          callback("Plate Solving failed");
        }
      } else if (message.code === -46) {
        setGotoErrors("GOTO bump its limit");
        if (callback) {
          callback("GOTO bump its limit");
        }
      } else if (message.code === 1006) {
        setGotoErrors("GOTO failure");
        if (callback) {
          callback("GOTO failure");
        }
      } else if (message.code === 1004) {
        if (callback) {
          callback("Start plate solving");
        }
      } else if (message.code === 1005) {
        if (callback) {
          callback("Start tracking");
        }
      }

      if (callback) {
        callback(message);
      }
      logger("startGoto:", message, connectionCtx);
    } else {
      logger("", message, connectionCtx);
    }
  });

  socket.addEventListener("error", (message) => {
    if (callback) {
      callback(message);
    }
    logger("startGoto error:", message, connectionCtx);
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
  object: AstroObject,
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
          setErrors(`Could not find object: ${object.designation}`);
        }
      })
      .catch((err) => stellariumErrorHandler(err, setErrors));
  } else {
    setErrors("App is not connect to Stellarium.");
  }
}
