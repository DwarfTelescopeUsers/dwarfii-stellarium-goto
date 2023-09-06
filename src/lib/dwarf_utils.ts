import {
  wsURL,
  turnOnCamera,
  binning2x2,
  turnOnCameraCmd,
  telephotoCamera,
  setExposure,
  setExposureValueCmd,
  setExposureMode,
  setExposureModeCmd,
  setGain,
  setGainValueCmd,
  setGainMode,
  setGainModeCmd,
  setIR,
  setIRCmd,
  socketSend,
} from "dwarfii_api";
import { logger } from "@/lib/logger";
import { ConnectionContextType } from "@/types";

export function turnOnCameraFn(
  cameraId: number,
  connectionCtx: ConnectionContextType
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));

  socket.addEventListener("open", () => {
    let binning = connectionCtx.astroSettings.binning
      ? connectionCtx.astroSettings.binning
      : binning2x2;
    let payload = turnOnCamera(binning, cameraId);
    logger("start turnOnCamera...", payload, connectionCtx);
    socketSend(socket, payload);
  });

  socket.addEventListener("message", (event) => {
    let message = JSON.parse(event.data);
    if (message.interface === turnOnCameraCmd) {
      logger("turnOnCamera:", message, connectionCtx);
    } else {
      logger("", message, connectionCtx);
    }
  });

  socket.addEventListener("error", (error) => {
    logger("turnOnCamera error:", error, connectionCtx);
  });

  socket.addEventListener("close", (message) => {
    logger("turnOnCamera close:", message, connectionCtx);
  });
}

export function updateTelescopeISPSetting(
  type: string,
  value: number,
  connectionCtx: ConnectionContextType
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  const socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
  let camera = telephotoCamera;
  let commands = [
    setExposureModeCmd,
    setExposureValueCmd,
    setGainValueCmd,
    setGainModeCmd,
    setIRCmd,
  ];

  socket.addEventListener("open", () => {
    let payload = {};
    if (type === "exposure") {
      payload = setExposure(camera, value);
      socketSend(socket, payload);
    } else if (type === "exposureMode") {
      payload = setExposureMode(camera, value);
      socketSend(socket, payload);
    } else if (type === "gain") {
      payload = setGain(camera, value);
      socketSend(socket, payload);
    } else if (type === "gainMode") {
      payload = setGainMode(camera, value);
      socketSend(socket, payload);
    } else if (type === "IR") {
      payload = setIR(value);
      socketSend(socket, payload);
    }
    logger(`start set ${type}...`, payload, connectionCtx);
  });

  socket.addEventListener("message", (event) => {
    let message = JSON.parse(event.data);
    if (commands.includes(message.interface)) {
      logger(`set ${type}:`, message, connectionCtx);
    } else {
      logger("", message, connectionCtx);
    }
  });

  socket.addEventListener("error", (message) => {
    logger(`set ${type} error:`, message, connectionCtx);
  });

  socket.addEventListener("close", (message) => {
    logger(`set ${type} close:`, message, connectionCtx);
  });
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
