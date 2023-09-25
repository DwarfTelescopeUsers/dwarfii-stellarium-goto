import type { Dispatch, SetStateAction } from "react";

import { AstroObject, ConnectionContextType } from "@/types";
import { focusPath, focusPosPath } from "@/lib/stellarium_utils";
import {
  wsURL,
  calibrateGoto,
  calibrateGotoCmd,
  startGoto,
  startGotoCmd,
  stopGoto,
  stopGotoCmd,
  shutDown,
  shutDownCmd,
  formatUtcUrl,
  formatTimeZoneUrl,
} from "dwarfii_api";
import eventBus from "@/lib/event_bus";
import { logger } from "@/lib/logger";
import {
  convertHMSToDecimalHours,
  convertHMSToDecimalDegrees,
  convertDMSToDecimalDegrees,
  convertRaDecToVec3d,
  ConvertStrDeg,
  ConvertStrHours,
  formatFloatToDecimalPlaces,
} from "@/lib/math_utils";
import { computeRaDecToAltAz, computealtAzToHADec } from "@/lib/astro_utils";
import { toIsoStringInLocalTime } from "@/lib/date_utils";

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

  let timezone = "";

  if (connectionCtx.timezone) timezone = connectionCtx.timezone;

  let timeZoneUrl = formatTimeZoneUrl(connectionCtx.IPDwarf, timezone);
  await fetch(timeZoneUrl)
    .then((res) => {
      return res.json();
    })
    .then((data) => {
      if (data.result == 0) {
        logger(
          "time zone ok: " + timezone,
          { "time zone ok": data.result },
          connectionCtx
        );
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
  setErrors: Dispatch<SetStateAction<string | undefined>>,
  setSuccess: Dispatch<SetStateAction<string | undefined>>,
  callback?: (options: any) => void // eslint-disable-line no-unused-vars
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  setErrors(undefined);
  setSuccess(undefined);
  eventBus.dispatch("clearErrors", { message: "clear errors" });
  eventBus.dispatch("clearSuccess", { message: "clear success" });

  await setUTCTime(connectionCtx);
  let lat = connectionCtx.latitude;
  /////////////////////////////////////////
  // Reverse the Longitude for the dwarf II : positive for WEST
  /////////////////////////////////////////
  let lon = 0;
  if (connectionCtx.longitude) lon = -connectionCtx.longitude;
  if (lat === undefined) return;
  if (lon === undefined) return;

  //socket connects to Dwarf
  if (connectionCtx.socketIPDwarf) {
    if (connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN)
      connectionCtx.socketIPDwarf.close();
  }
  let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
  connectionCtx.setSocketIPDwarf(socket);

  socket.addEventListener("open", () => {
    let options = calibrateGoto(lat as number, lon as number);

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
        setSuccess("");
        setErrors("Plate Solving failed");
        if (callback) {
          callback("Plate Solving failed");
        }
      } else if (message.code === -46) {
        setSuccess("");
        setErrors("GOTO bump its limit");
        if (callback) {
          callback("GOTO bump its limit");
        }
      } else if (message.code === 1000) {
        setErrors("");
        setSuccess("Start Calibration");
        if (callback) {
          callback("Start correction");
        }
      } else if (message.code === 1001) {
        setErrors("");
        setSuccess("Calibration phase #" + message.value.toString());
        if (callback) {
          callback("Correcting Plate Solving");
        }
      } else if (message.code === 1002) {
        setErrors("");
        setSuccess("");
        setErrors("Calibration failure");
        if (callback) {
          callback("Correction failure");
        }
      } else if (message.code === 1004) {
        setErrors("");
        setSuccess("Start plate solving");
        if (callback) {
          callback("Start plate solving");
        }
      } else if (message.code === 1009) {
        setErrors("");
        setSuccess("Calibration Done");
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

  socket.addEventListener("close", (message) => {
    if (callback) {
      callback(message);
    }
    logger("calibrateGoto close:", message, connectionCtx);
  });
}

export async function startGotoHandler(
  connectionCtx: ConnectionContextType,
  setGotoErrors: Dispatch<SetStateAction<string | undefined>>,
  setGotoSuccess: Dispatch<SetStateAction<string | undefined>>,
  planet: number | undefined | null,
  RA: string | undefined | null,
  declination: string | undefined | null,
  callback?: (options: any) => void, // eslint-disable-line no-unused-vars
  stopGoto: boolean = false
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  setGotoErrors(undefined);
  setGotoSuccess(undefined);
  eventBus.dispatch("clearErrors", { message: "clear errors" });

  // await setUTCTime(connectionCtx); no need ?
  let lat = connectionCtx.latitude;
  /////////////////////////////////////////
  // Reverse the Longitude for the dwarf II : positive for WEST
  /////////////////////////////////////////
  let lon = 0;
  if (connectionCtx.longitude) lon = -connectionCtx.longitude;
  if (lat === undefined) return;
  if (lon === undefined) return;

  //socket connects to Dwarf
  if (connectionCtx.socketIPDwarf) {
    if (connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN)
      connectionCtx.socketIPDwarf.close();
  }
  let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
  connectionCtx.setSocketIPDwarf(socket);

  socket.addEventListener("open", () => {
    let RA_number = RA ? convertHMSToDecimalHours(RA!, 7) : 0;
    let declination_number = declination
      ? convertDMSToDecimalDegrees(declination!)
      : 0;

    let options = startGoto(
      planet,
      RA_number,
      declination_number,
      lat as number,
      lon as number
    );

    connectionCtx.astroSettings.rightAcension = RA!;
    connectionCtx.astroSettings.declination = declination!;

    if (!connectionCtx.isSavedPosition && RA_number && declination_number) {
      let today = new Date();
      connectionCtx.astroSavePosition.rightAcension = RA_number;
      connectionCtx.astroSavePosition.declination = declination_number;
      (connectionCtx.astroSavePosition.strLocalTime =
        toIsoStringInLocalTime(today)),
        connectionCtx.setSavePositionStatus(true);
    }

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
        setGotoSuccess("");
        setGotoErrors("Target below the horizon");
        if (callback) {
          callback("Target below the horizon");
        }
      } else if (message.code === -18) {
        setGotoSuccess("");
        setGotoErrors("Plate Solving failed");
        if (callback) {
          callback("Plate Solving failed");
        }
      } else if (message.code === -46) {
        setGotoSuccess("");
        setGotoErrors("GOTO bump its limit");
        if (callback) {
          callback("GOTO bump its limit");
        }
      } else if (message.code === 1006) {
        setGotoSuccess("");
        setGotoErrors("GOTO failure");
        if (callback) {
          callback("GOTO failure");
        }
      } else if (message.code === 1003) {
        setGotoErrors("");
        setGotoSuccess("Start GoTo");
        if (callback) {
          callback("Start GoTo");
        }
      } else if (message.code === 1004) {
        setGotoErrors("");
        setGotoSuccess("Start plate solving");
        if (callback) {
          callback("Start plate solving");
        }
      } else if (message.code === 1005) {
        setGotoErrors("");
        setGotoSuccess("Start Tracking");
        if (callback) {
          callback("Start tracking");
        }
        // Stop Goto for Reset Position
        if (stopGoto) {
          stopGotoHandler(
            connectionCtx,
            setGotoErrors,
            setGotoSuccess,
            callback
          );
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

  socket.addEventListener("close", (message) => {
    if (callback) {
      callback(message);
    }
    logger("startGoto close:", message, connectionCtx);
  });
}

export function savePositionHandler(
  connectionCtx: ConnectionContextType,
  setPosition: Dispatch<SetStateAction<string | undefined>>
) {
  //Save Position

  if (
    connectionCtx.astroSavePosition.rightAcension &&
    connectionCtx.astroSavePosition.declination &&
    connectionCtx.astroSavePosition.strLocalTime
  ) {
    //Convert to RA to Degrees
    let results = computeRaDecToAltAz(
      connectionCtx.latitude!,
      connectionCtx.longitude!,
      connectionCtx.astroSavePosition.rightAcension! * 15,
      connectionCtx.astroSavePosition.declination!,
      connectionCtx.astroSavePosition.strLocalTime,
      connectionCtx.timezone
    );

    if (results) {
      connectionCtx.astroSavePosition.altitude = results.alt!;
      connectionCtx.astroSavePosition.azimuth = results.az!;
      connectionCtx.astroSavePosition.lst = results.lst!;

      connectionCtx.setIsSavedPosition(true);
      setPosition(
        "alt: " +
          ConvertStrDeg(formatFloatToDecimalPlaces(results.alt, 4)) +
          ",az: " +
          ConvertStrDeg(formatFloatToDecimalPlaces(results.az, 4))
      );
    }
  } else setPosition("No position has been recorded");
}

export function gotoPositionHandler(
  connectionCtx: ConnectionContextType,
  setPosition: Dispatch<SetStateAction<string | undefined>>,
  setGotoErrors: Dispatch<SetStateAction<string | undefined>>,
  setGotoSuccess: Dispatch<SetStateAction<string | undefined>>,
  callback?: (options: any) => void // eslint-disable-line no-unused-vars
) {
  //get Save Position
  let today = new Date();

  if (
    connectionCtx.astroSavePosition.altitude &&
    connectionCtx.astroSavePosition.azimuth
  ) {
    let results = computealtAzToHADec(
      connectionCtx.latitude!,
      connectionCtx.longitude!,
      connectionCtx.astroSavePosition.altitude!,
      connectionCtx.astroSavePosition.azimuth!,
      toIsoStringInLocalTime(today),
      connectionCtx.timezone
    );

    if (results) {
      setPosition(
        "alt: " +
          ConvertStrDeg(
            formatFloatToDecimalPlaces(
              connectionCtx.astroSavePosition.altitude,
              4
            )
          ) +
          ",az: " +
          ConvertStrDeg(
            formatFloatToDecimalPlaces(
              connectionCtx.astroSavePosition.azimuth,
              4
            )
          ) +
          " => RA: " +
          ConvertStrHours(results.ra / 15) +
          ", Declination: " +
          ConvertStrDeg(results.dec)
      );
      startGotoHandler(
        connectionCtx,
        setGotoErrors,
        setGotoSuccess,
        undefined,
        ConvertStrHours(results.ra / 15),
        ConvertStrDeg(results.dec),
        callback,
        true
      );
    }
  } else setPosition("No position has been recorded");
}

export async function stopGotoHandler(
  connectionCtx: ConnectionContextType,
  setGotoErrors: Dispatch<SetStateAction<string | undefined>>,
  setGotoSuccess: Dispatch<SetStateAction<string | undefined>>,
  callback?: (options: any) => void // eslint-disable-line no-unused-vars
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  setGotoErrors(undefined);
  setGotoSuccess(undefined);
  eventBus.dispatch("clearErrors", { message: "clear errors" });

  //socket connects to Dwarf
  if (connectionCtx.socketIPDwarf) {
    if (connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN)
      connectionCtx.socketIPDwarf.close();
  }
  let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
  connectionCtx.setSocketIPDwarf(socket);

  socket.addEventListener("open", () => {
    let options = stopGoto();

    if (callback) {
      callback("Stop goto");
      callback(options);
    }

    logger("start stopGoto...", options, connectionCtx);
    console.log("...", options);

    socket.send(JSON.stringify(options));
  });

  socket.addEventListener("message", (event) => {
    let message = JSON.parse(event.data);
    if (message.interface === stopGotoCmd) {
      if (message.code === -31) {
        setGotoSuccess("");
        setGotoErrors("Stopping Goto");
        if (callback) {
          callback("Stopping Goto");
        }
      } else if (message.code === 1007) {
        setGotoErrors("");
        setGotoSuccess("Stopping Astronomy function");
        if (callback) {
          callback("Stopping Astronomy function");
        }
      } else if (message.code === 1008) {
        setGotoErrors("");
        setGotoSuccess("End of Astronomy function");
        if (callback) {
          callback("End of Astronomy function");
        }
      }

      if (callback) {
        callback(message);
      }
      logger("stopGoto:", message, connectionCtx);
    } else {
      logger("", message, connectionCtx);
    }
  });

  socket.addEventListener("error", (message) => {
    if (callback) {
      callback(message);
    }
    logger("stopGoto error:", message, connectionCtx);
  });

  socket.addEventListener("close", (message) => {
    if (callback) {
      callback(message);
    }
    logger("stopGoto close:", message, connectionCtx);
  });
}

export async function shutDownHandler(
  connectionCtx: ConnectionContextType,
  setGotoErrors: Dispatch<SetStateAction<string | undefined>>,
  callback?: (options: any) => void // eslint-disable-line no-unused-vars
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  setGotoErrors(undefined);
  eventBus.dispatch("clearErrors", { message: "clear errors" });

  //socket connects to Dwarf
  if (connectionCtx.socketIPDwarf) {
    if (connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN)
      connectionCtx.socketIPDwarf.close();
  }
  let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
  connectionCtx.setSocketIPDwarf(socket);

  socket.addEventListener("open", () => {
    let options = shutDown();

    if (callback) {
      callback("shutdown");
      callback(options);
    }

    logger("start shutDown...", options, connectionCtx);
    console.log("...", options);

    socket.send(JSON.stringify(options));
  });

  socket.addEventListener("message", (event) => {
    let message = JSON.parse(event.data);
    if (message.interface === shutDownCmd) {
      if (callback) {
        callback(message);
      }
      logger("shutDown:", message, connectionCtx);
    } else {
      logger("", message, connectionCtx);
    }
  });

  socket.addEventListener("error", (message) => {
    if (callback) {
      callback(message);
    }
    logger("shutDown error:", message, connectionCtx);
  });

  socket.addEventListener("close", (message) => {
    if (callback) {
      callback(message);
    }
    logger("shutDown close:", message, connectionCtx);
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

export function centerCoordinatesHandler(
  RA: string | undefined,
  declination: string | undefined,
  connectionCtx: ConnectionContextType,
  setErrors: Dispatch<SetStateAction<string | undefined>>
) {
  eventBus.dispatch("clearErrors", { message: "clear errors" });

  let url = connectionCtx.urlStellarium;
  if (url) {
    console.log("select object in stellarium...");

    console.log("select object by coordinates in stellarium...");

    // Convert Ra and Dec to Vec3d used by Stellarium
    let RA_number = RA ? convertHMSToDecimalDegrees(RA!) : 0;
    let declination_number = declination
      ? convertDMSToDecimalDegrees(declination!)
      : 0;

    let coord = convertRaDecToVec3d(declination_number, RA_number);
    let str_coord = `[${coord.x},${coord.y},${coord.z}]`;
    console.log(`coordinates found: ${str_coord}`);

    let focusUrl = `${url}${focusPosPath}${str_coord}`;
    console.log("focusUrl : " + focusUrl);
    fetch(focusUrl, { method: "POST", signal: AbortSignal.timeout(2000) })
      // res.json don't work here
      .then((res) => {
        return res.text();
      })
      .then((data) => {
        console.log(data);
        if (data != "ok") {
          setErrors(`Could not find object by coordinates : ${str_coord}`);
        }
      })
      .catch((err) => stellariumErrorHandler(err, setErrors));
  } else {
    setErrors("App is not connect to Stellarium.");
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

    if (object.type == "Mosaic") {
      console.log("select object by coordinates in stellarium...");

      // Convert Ra and Dec to Vec3d used by Stellarium
      let RA_number = object.ra ? convertHMSToDecimalDegrees(object.ra!) : 0;
      let declination_number = object.dec
        ? convertDMSToDecimalDegrees(object.dec!)
        : 0;

      let coord = convertRaDecToVec3d(declination_number, RA_number);
      let str_coord = `[${coord.x},${coord.y},${coord.z}]`;
      console.log(`coordinates found: ${str_coord}`);

      let focusUrl = `${url}${focusPosPath}${str_coord}`;
      console.log("focusUrl : " + focusUrl);
      fetch(focusUrl, { method: "POST", signal: AbortSignal.timeout(2000) })
        // res.json don't work here
        .then((res) => {
          return res.text();
        })
        .then((data) => {
          console.log(data);
          if (data != "ok") {
            setErrors(`Could not find object by coordinates : ${str_coord}`);
          }
        })
        .catch((err) => stellariumErrorHandler(err, setErrors));
    } else {
      console.log("select object by name in stellarium...");
      let focusUrl = `${url}${focusPath}${object.designation}`;
      console.log("focusUrl : " + focusUrl);
      fetch(focusUrl, { method: "POST", signal: AbortSignal.timeout(2000) })
        .then((res) => {
          return res.text();
        })
        .then((data) => {
          console.log(data);
          if (data != "true") {
            setErrors(`Could not find object: ${object.designation}`);
          }
        })
        .catch((err) => stellariumErrorHandler(err, setErrors));
    }
  } else {
    setErrors("App is not connect to Stellarium.");
  }
}
