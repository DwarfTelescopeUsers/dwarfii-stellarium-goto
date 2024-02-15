import { WebSocketHandler } from "@/lib/websocket_class";
import {
  Dwarfii_Api,
  binning2x2,
  messageCameraTeleOpenCamera,
  messageCameraWideOpenCamera,
  messageCameraTeleSetExpMode,
  messageCameraTeleSetExp,
  messageCameraTeleSetGainMode,
  messageCameraTeleSetGain,
  messageCameraTeleSetIRCut,
  messageCameraTeleGetExpMode,
  messageCameraTeleGetExp,
  messageCameraTeleGetGainMode,
  messageCameraTeleGetGain,
  messageCameraTeleGetIRCut,
  //  messageCameraTeleSetAllParams
} from "dwarfii_api";
import { ConnectionContextType } from "@/types";

export const telephotoCamera = 0;
export const wideangleCamera = 1;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function turnOnTeleCameraFn(connectionCtx: ConnectionContextType) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }

  let binning = connectionCtx.astroSettings.binning
    ? connectionCtx.astroSettings.binning
    : binning2x2;

  const customMessageHandler = (
    result_data,
    txtInfoCommand,
    callback,
    webSocketHandlerInstance
  ) => {
    // Use webSocketHandlerInstance to access logic_data
    webSocketHandlerInstance.logic_data = false;
    if (result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_OPEN_CAMERA) {
      if (result_data.data.code == Dwarfii_Api.DwarfErrorCode.OK) {
        return true;
      }
    } else {
      return false;
    }
  };

  // Create WebSocketHandler
  const webSocketHandler = new WebSocketHandler(connectionCtx);

  // Send Command : messageCameraTeleOpenCamera
  let WS_Packet = messageCameraTeleOpenCamera(binning == binning2x2);
  let txtInfoCommand = "turnOnTeleCamera";

  webSocketHandler.prepare(
    WS_Packet,
    customMessageHandler,
    txtInfoCommand,
    undefined
  );
  webSocketHandler.run();

  await sleep(500);
}

export async function turnOnWideCameraFn(connectionCtx: ConnectionContextType) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }

  const customMessageHandler = (
    result_data,
    txtInfoCommand,
    callback,
    webSocketHandlerInstance
  ) => {
    // Use webSocketHandlerInstance to access logic_data
    webSocketHandlerInstance.logic_data = false;
    if (result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_CAMERA_WIDE_OPEN_CAMERA) {
      if (result_data.data.code == Dwarfii_Api.DwarfErrorCode.OK) {
        return true;
      }
    } else {
      return false;
    }
  };

  // Create WebSocketHandler
  const webSocketHandler = new WebSocketHandler(connectionCtx);

  // Send Command : messageCameraWideOpenCamera
  let WS_Packet = messageCameraWideOpenCamera();
  let txtInfoCommand = "turnOnWideCamera";

  webSocketHandler.prepare(
    WS_Packet,
    customMessageHandler,
    txtInfoCommand,
    undefined
  );
  webSocketHandler.run();

  await sleep(500);
}

export async function updateTelescopeISPSetting(
  type: string,
  value: number,
  connectionCtx: ConnectionContextType
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }

  let WS_Packet;
  let WS_Packet2;
  let cmd = "";
  let cmd2 = "";
  if (type === "exposure") {
    cmd = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_SET_EXP;
    WS_Packet = messageCameraTeleSetExp(value);
    cmd2 = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_GET_EXP;
    WS_Packet2 = messageCameraTeleGetExp();
  } else if (type === "exposureMode") {
    cmd = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_SET_EXP_MODE;
    WS_Packet = messageCameraTeleSetExpMode(value);
    cmd2 = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_GET_EXP_MODE;
    WS_Packet2 = messageCameraTeleGetExpMode();
  } else if (type === "gain") {
    cmd = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_SET_GAIN;
    WS_Packet = messageCameraTeleSetGain(value);
    cmd2 = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_GET_GAIN;
    WS_Packet2 = messageCameraTeleGetGain();
  } else if (type === "gainMode") {
    cmd = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_SET_GAIN_MODE;
    WS_Packet = messageCameraTeleSetGainMode(value);
    cmd2 = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_GET_GAIN_MODE;
    WS_Packet2 = messageCameraTeleGetGainMode();
  } else if (type === "IR") {
    cmd = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_SET_IRCUT;
    WS_Packet = messageCameraTeleSetIRCut(value);
    cmd2 = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_GET_IRCUT;
    WS_Packet2 = messageCameraTeleGetIRCut();
  }

  const customMessageHandler = (
    result_data,
    txtInfoCommand,
    callback,
    webSocketHandlerInstance
  ) => {
    // Use webSocketHandlerInstance to access logic_data
    webSocketHandlerInstance.logic_data = false;
    if (result_data.cmd == cmd) {
      if (result_data.data.code == Dwarfii_Api.DwarfErrorCode.OK) {
        return true;
      }
    } else if (result_data.cmd == cmd2) {
      if (result_data.data.code == Dwarfii_Api.DwarfErrorCode.OK) {
        return true;
      }
    } else {
      return false;
    }
  };

  // Create WebSocketHandler
  const webSocketHandler = new WebSocketHandler(connectionCtx, true);

  // Send Command : cmd
  let txtInfoCommand = "set ${type}";

  webSocketHandler.prepare(
    WS_Packet,
    customMessageHandler,
    txtInfoCommand,
    undefined
  );
  webSocketHandler.run();

  await sleep(100);

  webSocketHandler.prepare(
    WS_Packet2,
    customMessageHandler,
    txtInfoCommand,
    undefined
  );

  await sleep(100);

  /*
  cmd = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_SET_ALL_PARAMS;
  WS_Packet = messageCameraTeleSetAllParams(1,99, 1, 18, 1, 1, 2, 3, 120, 100, 90, 80, 60, 50 );

  webSocketHandler.prepare(
    WS_Packet,
    customMessageHandler,
    txtInfoCommand,
    undefined
  );
*/
}

import { calculateElapsedTime } from "@/lib/date_utils";
import { padNumber } from "@/lib/math_utils";

export function calculateSessionTime(connectionCtx: ConnectionContextType) {
  let data = calculateElapsedTime(
    connectionCtx.imagingSession.startTime,
    Date.now()
  );
  if (data) {
    return `${padNumber(data.hours)}:${padNumber(data.minutes)}:${padNumber(
      data.seconds
    )}`;
  }
}
