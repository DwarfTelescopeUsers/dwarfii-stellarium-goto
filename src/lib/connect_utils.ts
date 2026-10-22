import { ConnectionContextType } from "@/types";

import {
  configureDwarfProtocol,
  Dwarfii_Api,
  applyAuthoritativeCameraParam,
  getDwarfDeviceProfile,
  ingestV3ParameterNotification,
  loadV3AstroParameterCatalog,
  resetV3CameraParameterCache,
  V3_SESSION_READY_COMMAND,
  WebSocketHandler,
} from "@/services/dwarf";
import {
  saveConnectionStatusDB,
  saveInitialConnectionTimeDB,
} from "@/db/db_utils";
import { telephotoCamera, wideangleCamera } from "@/lib/dwarf_utils";
import {
  findDeviceInfo,
  checkMediaMtxStreamWithUpdate,
} from "@/lib/get_dwarf_type";
import { saveImagingSessionDb, saveIPConnectDB } from "@/db/db_utils";
import { logger } from "@/lib/logger";

function updateAstroCamera(connectionCtx: ConnectionContextType, cmd) {
  if (
    cmd ==
      Dwarfii_Api.DwarfCMD.CMD_NOTIFY_STATE_WIDE_CAPTURE_RAW_LIVE_STACKING ||
    cmd ==
      Dwarfii_Api.DwarfCMD.CMD_NOTIFY_PROGRASS_WIDE_CAPTURE_RAW_LIVE_STACKING
  ) {
    saveImagingSessionDb("astroCamera", wideangleCamera.toString());
    connectionCtx.setImagingSession((prev) => ({
      ...prev,
      astroCamera: wideangleCamera,
    }));

    connectionCtx.setCurrentAstroCamera(wideangleCamera);
  } else {
    saveImagingSessionDb("astroCamera", telephotoCamera.toString());
    connectionCtx.setImagingSession((prev) => ({
      ...prev,
      astroCamera: telephotoCamera,
    }));
    connectionCtx.setCurrentAstroCamera(telephotoCamera);
  }
}

/**
 * Apply model-independent telemetry emitted by both the legacy notification
 * commands and the current V3 protocol. V3's initial device-state response
 * also carries the current CMOS temperature, so the header does not have to
 * wait for the next periodic notification after connecting.
 */
export function applyDeviceTelemetry(
  connectionCtx: ConnectionContextType,
  resultData: { cmd?: number; data?: any },
): boolean {
  const { cmd, data } = resultData;
  if (!data || (data.code !== undefined && data.code !== 0)) return false;

  if (cmd === V3_SESSION_READY_COMMAND) {
    const state = data.deviceStateInfo;
    if (state?.batteryInfo)
      applyDeviceTelemetry(connectionCtx, {
        cmd: 15201,
        data: state.batteryInfo,
      });
    if (state?.chargingState)
      applyDeviceTelemetry(connectionCtx, {
        cmd: 15202,
        data: state.chargingState,
      });
    if (state?.storageInfo)
      applyDeviceTelemetry(connectionCtx, {
        cmd: 15203,
        data: state.storageInfo,
      });
    const cmos = data.teleCameraStateInfo?.cmosTemperature;
    if (cmos?.temperature !== undefined)
      applyDeviceTelemetry(connectionCtx, { cmd: 15292, data: cmos });
    else if (state?.temperature)
      applyDeviceTelemetry(connectionCtx, {
        cmd: 15243,
        data: state.temperature,
      });
    return true;
  }

  if (cmd === Dwarfii_Api.DwarfCMD.CMD_NOTIFY_ELE) {
    const battery = Number(data.percentage ?? 0);
    if (
      Number.isFinite(battery) &&
      (data.code === undefined || data.code === Dwarfii_Api.DwarfErrorCode.OK)
    ) {
      connectionCtx.setBatteryLevelDwarf(
        Math.max(0, Math.min(100, Math.round(battery))),
      );
    }
    return true;
  }

  if (cmd === Dwarfii_Api.DwarfCMD.CMD_NOTIFY_CHARGE) {
    const chargeState = Number(data.state ?? 0);
    if (
      Number.isFinite(chargeState) &&
      (data.code === undefined || data.code === Dwarfii_Api.DwarfErrorCode.OK)
    ) {
      connectionCtx.setBatteryStatusDwarf(chargeState);
    }
    return true;
  }

  if (cmd === Dwarfii_Api.DwarfCMD.CMD_NOTIFY_SDCARD_INFO) {
    if (data.isValid !== true) {
      connectionCtx.setAvailableSizeDwarf(undefined);
      connectionCtx.setTotalSizeDwarf(undefined);
      return true;
    }
    const availableSize = Number(data.availableSize ?? 0);
    const totalSize = Number(data.totalSize ?? 0);
    if (Number.isFinite(availableSize) && Number.isFinite(totalSize)) {
      connectionCtx.setAvailableSizeDwarf(availableSize);
      connectionCtx.setTotalSizeDwarf(totalSize);
    }
    return true;
  }

  if (
    cmd === Dwarfii_Api.DwarfCMD.CMD_NOTIFY_TEMPERATURE ||
    cmd === Dwarfii_Api.DwarfCMD.CMD_V3_NOTIFY_TEMPERATURE2
  ) {
    const temperature = Number(
      cmd === 15243 ? (data.temperature ?? 0) : data.temperature,
    );
    if (Number.isFinite(temperature)) {
      connectionCtx.setStatusTemperatureDwarf(temperature);
    }
    return true;
  }

  return false;
}

export async function connectionHandler(
  connectionCtx: ConnectionContextType,
  IPDwarf: string | undefined,
  forceIP: boolean,
  setConnecting: Function,
  setSlavemode: Function,
  setGoLive: Function,
  setErrorTxt: Function,
) {
  connectionCtx.setBatteryLevelDwarf(undefined);
  connectionCtx.setAvailableSizeDwarf(undefined);
  connectionCtx.setTotalSizeDwarf(undefined);
  connectionCtx.setStatusTemperatureDwarf(undefined);

  if (IPDwarf === undefined) {
    return;
  }
  setConnecting(true);
  connectionCtx.setConnectionStatus(false);
  connectionCtx.setConnectionStatusSlave(true);

  let discoveryError: string | undefined;
  const [deviceId, deviceUid] = await findDeviceInfo(
    IPDwarf,
    connectionCtx,
    (message) => {
      discoveryError = message;
    },
  );
  if (!deviceId) {
    setConnecting(false);
    setErrorTxt(
      discoveryError ?? "Unable to identify a supported DWARF device.",
    );
    return;
  }

  let deviceProfile;
  try {
    deviceProfile = getDwarfDeviceProfile(deviceId);
  } catch (error) {
    setConnecting(false);
    setErrorTxt(error instanceof Error ? error.message : String(error));
    return;
  }

  connectionCtx.setTypeIdDwarf(deviceProfile.deviceId);
  connectionCtx.setTypeNameDwarf(deviceProfile.displayName);
  if (deviceUid) connectionCtx.setTypeUidDwarf(deviceUid);

  console.log("socketIPDwarf: ", connectionCtx.socketIPDwarf); // Create WebSocketHandler if need
  const webSocketHandler = connectionCtx.socketIPDwarf
    ? connectionCtx.socketIPDwarf
    : new WebSocketHandler(IPDwarf);

  webSocketHandler.resetReconnectGuard?.();

  connectionCtx.setSocketIPDwarf(webSocketHandler);
  // Bind asynchronous discovery/notification handlers to this socket even before
  // React renders the updated context. Never key their caches by a stale context.
  connectionCtx = {
    ...connectionCtx,
    IPDwarf,
    socketIPDwarf: webSocketHandler,
  };
  const proxyLocalIP =
    connectionCtx.proxyInLan && connectionCtx.proxyLocalIP
      ? connectionCtx.proxyLocalIP
      : connectionCtx.proxyIP;
  console.log("Current Proxy: " + proxyLocalIP);
  if (proxyLocalIP) {
    const port = connectionCtx.useHttps
      ? process.env.NEXT_PUBLIC_PORT_PROXY_CORS_HTTPS
      : process.env.NEXT_PUBLIC_PORT_PROXY_CORS;
    await webSocketHandler.setProxyUrl(`${proxyLocalIP}:${port}`);
  }
  await webSocketHandler.setHttpsMode(connectionCtx.useHttps);
  // Force IP
  if (forceIP) {
    await webSocketHandler.setNewIpDwarf(IPDwarf);
  }

  try {
    configureDwarfProtocol(webSocketHandler, deviceProfile);
  } catch (error) {
    setConnecting(false);
    setErrorTxt(error instanceof Error ? error.message : String(error));
    return;
  }

  if (deviceProfile.capabilities.rtspPreview) {
    await checkMediaMtxStreamWithUpdate(IPDwarf, connectionCtx);
  }

  let catalogLoaded = false;
  let hasProtocolResponse = false;
  let ownershipRequested = false;
  const clearTelemetry = () => {
    connectionCtx.setBatteryLevelDwarf(undefined);
    connectionCtx.setAvailableSizeDwarf(undefined);
    connectionCtx.setTotalSizeDwarf(undefined);
    connectionCtx.setStatusTemperatureDwarf(undefined);
    connectionCtx.setValueFocusDwarf(undefined);
  };
  const markDisconnected = () => {
    resetV3CameraParameterCache(connectionCtx);
    hasProtocolResponse = false;
    ownershipRequested = false;
    catalogLoaded = false;
    connectionCtx.setConnectionStatus(false);
    connectionCtx.setConnectionStatusSlave(true);
    saveConnectionStatusDB(false);
    clearTelemetry();
  };
  const applyOwnership = (data: { mode?: number; lock?: boolean }) => {
    const slave = (data.mode ?? 0) !== 0 || data.lock !== true;
    connectionCtx.setConnectionStatusSlave(slave);
    setSlavemode(slave);
  };
  const customMessageHandler = async (sender, packet) => {
    if (!packet.known || packet.type === 0) return;
    applyDeviceTelemetry(connectionCtx, packet);
    const data = packet.data;
    if (packet.cmd === V3_SESSION_READY_COMMAND && (data.code ?? 0) === 0) {
      const ownership = data.connectionStateInfo?.hostSlaveMode;
      if (ownership) applyOwnership(ownership);
      if (!catalogLoaded && webSocketHandler.isConnected()) {
        catalogLoaded = true;
        try {
          await loadV3AstroParameterCatalog(IPDwarf, connectionCtx);
        } catch (error) {
          catalogLoaded = false;
          logger(
            "Camera parameter discovery unavailable",
            { error: String(error) },
            connectionCtx,
          );
        }
      }
    } else if (packet.cmd === 15264) {
      const parameter = ingestV3ParameterNotification(data, connectionCtx);
      if (parameter) applyAuthoritativeCameraParam(connectionCtx, parameter);
    } else if (packet.cmd === 15223) {
      applyOwnership(data);
    } else if ([15208, 15236].includes(packet.cmd)) {
      updateAstroCamera(connectionCtx, packet.cmd);
      const state = data.state ?? 0;
      const recording = state === 1 || state === 2;
      const stopped = state === 3;
      connectionCtx.setImagingSession((current) => ({
        ...current,
        isRecording: recording,
        endRecording: stopped,
        isGoLive: stopped,
      }));
      saveImagingSessionDb("isRecording", String(recording));
      saveImagingSessionDb("endRecording", String(stopped));
      saveImagingSessionDb("isGoLive", String(stopped));
      setGoLive(stopped);
    } else if ([15209, 15237].includes(packet.cmd)) {
      updateAstroCamera(connectionCtx, packet.cmd);
      // Progress does not imply idle or capture completion.
      connectionCtx.setImagingSession((current) => ({
        ...current,
        imagesTaken: data.currentCount ?? 0,
        imagesStacked: data.stackedCount ?? 0,
      }));
      saveImagingSessionDb("imagesTaken", String(data.currentCount ?? 0));
      saveImagingSessionDb("imagesStacked", String(data.stackedCount ?? 0));
    } else if (packet.cmd === 15234) {
      if ((data.camId ?? 0) === 0)
        connectionCtx.setStreamTypeTeleDwarf(data.streamType ?? 0);
      else if (data.camId === 1)
        connectionCtx.setStreamTypeWideDwarf(data.streamType ?? 0);
    } else if (packet.cmd === 15257) {
      connectionCtx.setValueFocusDwarf(data.pos ?? 0);
    } else if (packet.cmd === 15221) {
      connectionCtx.setStatusRingLightsDwarf(data.state === 1);
    } else if (packet.cmd === 15222) {
      connectionCtx.setStatusPowerLightsDwarf(data.state === 1);
    } else if (packet.cmd === 15229) {
      setErrorTxt("The DWARF is powering off.");
      await webSocketHandler.cleanup(true);
    }
    logger(sender, packet, connectionCtx);
  };

  webSocketHandler.setProtocolResponseHandler(() => {
    connectionCtx.setConnectionStatus(true);
    saveConnectionStatusDB(true);
    setConnecting(false);
    if (!hasProtocolResponse) {
      hasProtocolResponse = true;
      connectionCtx.setInitialConnectionTime(Date.now());
      saveInitialConnectionTimeDB();
      saveIPConnectDB(IPDwarf);
    }
    if (!ownershipRequested) {
      ownershipRequested = true;
      void webSocketHandler
        .request("setMasterLock", { lock: true })
        .catch((error) => {
          setErrorTxt(error instanceof Error ? error.message : String(error));
        });
    }
  });
  webSocketHandler.setTelemetryHandler((telemetry) => {
    if (telemetry.batteryPercentage !== undefined)
      connectionCtx.setBatteryLevelDwarf(telemetry.batteryPercentage);
    if (telemetry.chargingState !== undefined)
      connectionCtx.setBatteryStatusDwarf(telemetry.chargingState);
    if (telemetry.storageValid === false) {
      connectionCtx.setAvailableSizeDwarf(undefined);
      connectionCtx.setTotalSizeDwarf(undefined);
    } else if (telemetry.storageValid === true) {
      connectionCtx.setAvailableSizeDwarf(telemetry.availableSize);
      connectionCtx.setTotalSizeDwarf(telemetry.totalSize);
    }
    if (telemetry.temperature !== undefined)
      connectionCtx.setStatusTemperatureDwarf(telemetry.temperature);
  });
  const customStateHandler = (ready: boolean) => {
    if (!ready) markDisconnected();
  };
  const customErrorHandler = (error?: unknown) => {
    connectionCtx.setDeviceError?.(
      error instanceof Error
        ? error.message
        : "The DWARF connection is unavailable.",
    );
    setErrorTxt(
      error instanceof Error
        ? error.message
        : "The DWARF connection is unavailable. Retry when it is reachable.",
    );
    if (!webSocketHandler.isConnected()) {
      markDisconnected();
      setConnecting(false);
    }
  };
  await webSocketHandler.prepare(
    undefined,
    "Connection",
    ["*"],
    customMessageHandler,
    customStateHandler,
    customErrorHandler,
  );
  webSocketHandler.startTelemetryPolling();
  if (!(await webSocketHandler.run())) {
    markDisconnected();
    setConnecting(false);
    setErrorTxt("Could not start the DWARF connection.");
  }
}
