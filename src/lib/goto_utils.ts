import type { Dispatch, SetStateAction } from "react";
import { AstroObject, ConnectionContextType } from "@/types";
import { focusPath, focusPosPath } from "@/lib/stellarium_utils";
import { WebSocketHandler } from "@/lib/websocket_class";

import {
  Dwarfii_Api,
  messageSetTime,
  messageSetTimezone,
  messageCameraTeleOpenCamera,
  messageAstroStartCalibration,
  messageAstroStartGotoSolarSystem,
  messageAstroStartGotoDso,
  messageAstroStopGoto,
  messageCameraTeleCloseCamera,
  messageCameraWideCloseCamera,
  messageRgbPowerReboot,
  messageRgbPowerDown,
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  let timezone = "";

  if (connectionCtx.timezone) timezone = connectionCtx.timezone;

  let lat = connectionCtx.latitude;
  /////////////////////////////////////////
  // Reverse the Longitude for the dwarf II : positive for WEST
  /////////////////////////////////////////
  let lon = 0;
  if (connectionCtx.longitude) lon = -connectionCtx.longitude;
  if (lat === undefined) return;
  if (lon === undefined) return;

  const customMessageHandler1 = (
    result_data,
    txtInfoCommand,
    callback,
    webSocketHandlerInstance
  ) => {
    // Use webSocketHandlerInstance to access logic_data
    webSocketHandlerInstance.logic_data = false;
    if (result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_SYSTEM_SET_TIME) {
      if (result_data.data.code == 0) {
        if (callback) {
          callback(txtInfoCommand + " ok");
        }
      } else {
        if (callback) {
          callback(txtInfoCommand + " error");
        }
      }
      return true;
    } else return false;
  };
  const customMessageHandler2 = (
    result_data,
    txtInfoCommand,
    callback,
    webSocketHandlerInstance
  ) => {
    // Use webSocketHandlerInstance to access logic_data
    webSocketHandlerInstance.logic_data = false;
    if (result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_SYSTEM_SET_TIME_ZONE) {
      if (result_data.data.code == 0) {
        if (callback) {
          callback(txtInfoCommand + " ok");
        }
      } else {
        if (callback) {
          callback(txtInfoCommand + " error");
        }
      }
      return true;
    } else return false;
  };

  const customMessageHandler3 = (
    result_data,
    txtInfoCommand,
    callback,
    webSocketHandlerInstance
  ) => {
    // Use webSocketHandlerInstance to access logic_data
    webSocketHandlerInstance.logic_data = false;
    if (result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_OPEN_CAMERA) {
      if (result_data.data.code == 0) {
        if (callback) {
          callback(txtInfoCommand + " ok");
        }
      } else {
        if (callback) {
          callback(txtInfoCommand + " error");
        }
      }
      return true;
    } else return false;
  };

  const customMessageHandler4 = (
    result_data,
    txtInfoCommand,
    callback,
    webSocketHandlerInstance
  ) => {
    // Use webSocketHandlerInstance to access logic_data
    if (result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_ASTRO_START_CALIBRATION) {
      if (
        result_data.data.code ==
        Dwarfii_Api.DwarfErrorCode.CODE_ASTRO_PLATE_SOLVING_FAILED
      ) {
        setErrors("");
        setSuccess("");
        setErrors("Error Plate Solving");
        if (callback) {
          callback("Error Plate Solving");
        }
        console.error("Error CALIBRATION CODE_ASTRO_PLATE_SOLVING_FAILED");
      }
      if (
        result_data.data.code ==
        Dwarfii_Api.DwarfErrorCode.CODE_ASTRO_CALIBRATION_FAILED
      ) {
        setErrors("");
        setSuccess("");
        webSocketHandlerInstance.logic_data = true;
        setErrors(txtInfoCommand + " Failure");
        if (callback) {
          callback(txtInfoCommand + " Failure");
        }
        console.error("Error CALIBRATION CODE_ASTRO_CALIBRATION_FAILED");
      }
      logger("calibrateGoto:", result_data, connectionCtx);
    } else if (
      result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_NOTIFY_STATE_ASTRO_CALIBRATION
    ) {
      if (
        webSocketHandlerInstance.logic_data == false &&
        result_data.data.state == Dwarfii_Api.AstroState.ASTRO_STATE_IDLE
      ) {
        setErrors("");
        setSuccess(txtInfoCommand + " Done");
        if (callback) {
          callback(txtInfoCommand + " Successfully");
        }
      } else if (
        webSocketHandlerInstance.logic_data == true &&
        result_data.data.state == Dwarfii_Api.AstroState.ASTRO_STATE_IDLE
      ) {
        setErrors("");
        setSuccess("");
        setErrors(txtInfoCommand + " Failure");
        if (callback) {
          callback(txtInfoCommand + " Failure");
        }
      } else {
        setErrors("");
        setSuccess(
          txtInfoCommand +
            " Phase #" +
            result_data.data.plateSolvingTimes +
            " " +
            Dwarfii_Api.AstroState[result_data.data.state]
        );
        if (callback) {
          callback(
            txtInfoCommand +
              " Phase #" +
              result_data.data.plateSolvingTimes +
              " " +
              Dwarfii_Api.AstroState[result_data.data.state]
          );
        }
      }
    } else {
      return false;
    }
    return true;
  };

  // Create WebSocketHandler
  const webSocketHandler = new WebSocketHandler(connectionCtx);

  // Send Command : messageSetTime
  let WS_Packet1 = messageSetTime();
  let txtInfoCommand1 = "SetTime";

  webSocketHandler.prepare(
    WS_Packet1,
    customMessageHandler1,
    txtInfoCommand1,
    callback
  );

  webSocketHandler.run();

  await sleep(5000);

  // Send Command : messageSetTimezone
  let WS_Packet2 = messageSetTimezone(timezone);
  let txtInfoCommand2 = "SetTimezone";

  webSocketHandler.prepare(
    WS_Packet2,
    customMessageHandler2,
    txtInfoCommand2,
    callback
  );

  // Send Command : messageCameraTeleOpenCamera
  let WS_Packet3 = messageCameraTeleOpenCamera(false);
  let txtInfoCommand3 = "OpenTeleCamera";

  webSocketHandler.prepare(
    WS_Packet3,
    customMessageHandler3,
    txtInfoCommand3,
    callback
  );

  // Send Command : messageAstroStartCalibration
  let WS_Packet4 = messageAstroStartCalibration();
  let txtInfoCommand4 = "Calibration";
  webSocketHandler.prepare(
    WS_Packet4,
    customMessageHandler4,
    txtInfoCommand4,
    callback
  );
}

export async function startGotoHandler(
  connectionCtx: ConnectionContextType,
  setGotoErrors: Dispatch<SetStateAction<string | undefined>>,
  setGotoSuccess: Dispatch<SetStateAction<string | undefined>>,
  planet: number | undefined | null,
  RA: string | undefined | null,
  declination: string | undefined | null,
  objectName: string | undefined,
  callback?: (options: any) => void, // eslint-disable-line no-unused-vars
  stopGoto: boolean = false
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  setGotoErrors(undefined);
  setGotoSuccess(undefined);
  eventBus.dispatch("clearErrors", { message: "clear errors" });

  let lat = 0;
  if (connectionCtx.latitude) lat = connectionCtx.latitude;
  /////////////////////////////////////////
  // Reverse the Longitude for the dwarf II : positive for WEST
  /////////////////////////////////////////
  let lon = 0;
  if (connectionCtx.longitude) lon = -connectionCtx.longitude;
  if (lat === undefined) return;
  if (lon === undefined) return;

  const customMessageHandler = (
    result_data,
    txtInfoCommand,
    callback,
    webSocketHandlerInstance
  ) => {
    // Use webSocketHandlerInstance to access logic_data
    if (
      result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_ASTRO_START_GOTO_DSO ||
      result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_ASTRO_START_GOTO_SOLAR_SYSTEM
    ) {
      if (result_data.data.code != Dwarfii_Api.DwarfErrorCode.OK) {
        setGotoSuccess("");
        setGotoErrors("Error GOTO : " + result_data.data.errorTxt);
        if (
          result_data.data.code ==
          Dwarfii_Api.DwarfErrorCode.CODE_ASTRO_GOTO_FAILED
        )
          webSocketHandlerInstance.logic_data = true;

        if (callback) {
          callback("Error GoTo");
        }
      }
    } else if (
      !webSocketHandlerInstance.logic_data &&
      result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_NOTIFY_STATE_ASTRO_GOTO
    ) {
      setGotoSuccess(result_data.data.stateText);
      setGotoErrors("");
      if (callback) {
        callback("Info GoTo");
      }
    } else if (
      !webSocketHandlerInstance.logic_data &&
      result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_NOTIFY_STATE_ASTRO_TRACKING
    ) {
      if (
        result_data.data.state == Dwarfii_Api.AstroState.ASTRO_STATE_RUNNING &&
        result_data.data.target_name == objectName
      ) {
        setGotoSuccess("Start Tracking");
        setGotoErrors("");
        if (callback) {
          callback("Start Tracking");
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
    } else {
      return false;
    }
    return true;
  };

  let RA_number = RA ? convertHMSToDecimalHours(RA!, 7) : 0;
  let declination_number = declination
    ? convertDMSToDecimalDegrees(declination!)
    : 0;

  connectionCtx.astroSettings.rightAcension = RA!;
  connectionCtx.astroSettings.declination = declination!;

  if (!connectionCtx.isSavedPosition && RA_number && declination_number) {
    let today = new Date();
    connectionCtx.astroSavePosition.rightAcension = RA_number;
    connectionCtx.astroSavePosition.declination = declination_number;
    connectionCtx.astroSavePosition.strLocalTime =
      toIsoStringInLocalTime(today);
    connectionCtx.setSavePositionStatus(true);
  }
  console.log("Object Name :  " + objectName);
  if (planet) {
    console.log("planet :  " + planet);
  }
  if (planet) {
    console.log("planet Name : " + Dwarfii_Api.SolarSystemTarget[planet]);
  }
  let WS_Packet;
  if (planet) {
    // Send Command : cmdAstroStartGotoDso
    if (Dwarfii_Api.SolarSystemTarget[planet]) {
      console.log("WS_Packet:1"),
        (WS_Packet = messageAstroStartGotoSolarSystem(
          planet,
          lon,
          lat,
          Dwarfii_Api.SolarSystemTarget[planet]
        ));
    } else if (objectName) {
      console.log("WS_Packet:2");
      WS_Packet = messageAstroStartGotoSolarSystem(
        planet,
        lon,
        lat,
        objectName
      );
    } else {
      WS_Packet = messageAstroStartGotoSolarSystem(planet, lon, lat, "-");
      console.log("WS_Packet:2");
    }
  } else if (objectName) {
    // Send Command : messageAstroStartGotoDso
    WS_Packet = messageAstroStartGotoDso(
      RA_number,
      declination_number,
      objectName
    );
  }

  // Create WebSocketHandler
  const webSocketHandler = new WebSocketHandler(connectionCtx);

  // Send Command
  let txtInfoCommand = "Start goto";

  webSocketHandler.prepare(
    WS_Packet,
    customMessageHandler,
    txtInfoCommand,
    callback
  );
  webSocketHandler.run();
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
        "",
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

  const customMessageHandler = (
    result_data,
    txtInfoCommand,
    callback,
    webSocketHandlerInstance
  ) => {
    // Use webSocketHandlerInstance to access logic_data
    webSocketHandlerInstance.logic_data = false;
    if (result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_ASTRO_STOP_GOTO) {
      if (result_data.data.code == Dwarfii_Api.DwarfErrorCode.OK) {
        setGotoSuccess("Stopping Goto");
        setGotoErrors("");
        if (callback) {
          callback("Stopping Goto");
        }
      }
    } else if (
      result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_NOTIFY_STATE_ASTRO_GOTO
    ) {
      if (callback) {
        callback(result_data);
      }
    } else {
      return false;
    }
    return true;
  };

  // Create WebSocketHandler
  const webSocketHandler = new WebSocketHandler(connectionCtx);

  // Send Command : messageAstroStopGoto
  let WS_Packet = messageAstroStopGoto();
  let txtInfoCommand = "stopGoto";

  webSocketHandler.prepare(
    WS_Packet,
    customMessageHandler,
    txtInfoCommand,
    callback
  );
  webSocketHandler.run();
}

export async function shutDownHandler(
  reboot: boolean,
  connectionCtx: ConnectionContextType,
  setGotoErrors: Dispatch<SetStateAction<string | undefined>>,
  callback?: (options: any) => void // eslint-disable-line no-unused-vars
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  setGotoErrors(undefined);
  eventBus.dispatch("clearErrors", { message: "clear errors" });

  const customMessageHandler = (
    result_data,
    txtInfoCommand,
    callback,
    webSocketHandlerInstance
  ) => {
    // Use webSocketHandlerInstance to access logic_data
    webSocketHandlerInstance.logic_data = false;
    if (
      result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_RGB_POWER_POWER_DOWN ||
      result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_RGB_POWER_REBOOT ||
      result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_CLOSE_CAMERA ||
      result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_CAMERA_WIDE_CLOSE_CAMERA ||
      result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_NOTIFY_POWER_OFF
    ) {
      return true;
    } else {
      return false;
    }
  };

  // Send Command : cmdRgbPowerReboot or cmdRgbPowerDown
  let WS_Packet1 = {};
  let WS_Packet2 = {};
  let WS_Packet3 = {};
  let txtInfoCommand = "Shutdown";
  if (reboot) {
    WS_Packet1 = messageCameraTeleCloseCamera();
    WS_Packet2 = messageCameraWideCloseCamera();
    WS_Packet3 = messageRgbPowerReboot();
    txtInfoCommand = "Reboot";
  } else WS_Packet1 = messageRgbPowerDown();

  // Create WebSocketHandler
  const webSocketHandler = new WebSocketHandler(connectionCtx);

  webSocketHandler.prepare(
    WS_Packet1,
    customMessageHandler,
    txtInfoCommand,
    callback
  );
  webSocketHandler.run();

  if (reboot) {
    webSocketHandler.prepare(
      WS_Packet2,
      customMessageHandler,
      txtInfoCommand,
      callback
    );

    webSocketHandler.prepare(
      WS_Packet3,
      customMessageHandler,
      txtInfoCommand,
      callback
    );
  }
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
