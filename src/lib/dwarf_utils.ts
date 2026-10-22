import type { ConnectionContextType } from "@/types";
import {
  findCurrentCameraParameter,
  selectCurrentParameterValue,
  decodeCurrentParamId,
  type CurrentCatalogParameter,
  type CurrentCommand,
} from "dwarfii_api";
import {
  loadV3CameraParameterCatalog,
  getV3NormalizedCameraCatalog,
  applyAuthoritativeCameraParam,
  resolveScienceFilterIndex,
} from "@/services/dwarf/cameraParams";
import {
  allowedGains,
  allowedWBColorTemp,
  getGainNameByIndex,
} from "@/lib/data_utils";
import {
  allowedWideGains,
  allowedWideWBColorTemp,
  getWideGainNameByIndex,
} from "@/lib/data_wide_utils";
import { logger } from "@/lib/logger";
import { deviceOperationIsCurrent } from "@/services/dwarf/operationScope";

export const telephotoCamera = 0;
export const wideangleCamera = 1;

function report(context: ConnectionContextType, error: unknown): void {
  if (context.deviceOperationSignal?.aborted) return;
  const message = error instanceof Error ? error.message : String(error);
  context.setDeviceError?.(message);
  logger("Device settings failed", { error: message }, context);
}

function socket(context: ConnectionContextType) {
  if (context.deviceOperationSignal?.aborted)
    throw new Error("The originating device workspace was closed.");
  if (!context.socketIPDwarf?.isConnected())
    throw new Error("Connect to the DWARF before changing camera settings.");
  return context.socketIPDwarf;
}

async function catalog(context: ConnectionContextType, modeId = 2) {
  if (!context.IPDwarf) throw new Error("No DWARF address is selected.");
  const device = socket(context);
  const generation = device.session?.state.generation;
  await loadV3CameraParameterCatalog(context.IPDwarf, context, modeId);
  if (
    context.socketIPDwarf !== device ||
    device.session?.state.generation !== generation ||
    !device.isConnected()
  )
    throw new Error(
      "The DWARF reconnected while loading settings. Retry the request.",
    );
  const result = getV3NormalizedCameraCatalog(modeId, context);
  if (!result) throw new Error("The camera parameter catalog is unavailable.");
  return result;
}

/** Existing form values are ordinals; firmware gain values are not. */
export function resolveCurrentCameraGainValue(
  context: ConnectionContextType,
  cameraId: number,
  uiIndex: number,
  modeId = 2,
): number {
  const data = getV3NormalizedCameraCatalog(modeId, context);
  const parameter = data && findCurrentCameraParameter(data, cameraId, "gain");
  if (!parameter)
    throw new Error("Gain capabilities are unavailable for this camera.");
  const label =
    cameraId === 0
      ? getGainNameByIndex(uiIndex, context.typeIdDwarf)
      : getWideGainNameByIndex(uiIndex, context.typeIdDwarf);
  const gain = Number(label);
  if (!Number.isFinite(gain))
    throw new Error("Select a supported manual gain.");
  selectCurrentParameterValue(parameter, gain);
  return gain;
}

async function preview(
  context: ConnectionContextType,
  cameraId: number,
  setStatus?: Function,
  setSource?: Function,
): Promise<void> {
  try {
    const device = socket(context);
    const current = deviceOperationIsCurrent(context);
    if (!context.connectionStatusSlave) {
      // Enter without changing shooting mode or waiting an arbitrary delay.
      await device.request("enterCamera", { clientParam: { encodeType: 1 } });
      if (!current()) return;
      await device.request(
        cameraId === 0 ? "telePreviewQuality" : "widePreviewQuality",
        { level: 1 },
      );
    }
    if (!current()) return;
    setStatus?.("on");
    setSource?.(true);
  } catch (error) {
    setStatus?.("off");
    setSource?.(false);
    report(context, error);
  }
}
export async function turnOnTeleCameraFn(
  context: ConnectionContextType,
  setStatus?: Function,
  setSource?: Function,
) {
  return preview(context, 0, setStatus, setSource);
}
export async function turnOnWideCameraFn(
  context: ConnectionContextType,
  setStatus?: Function,
  setSource?: Function,
) {
  return preview(context, 1, setStatus, setSource);
}

type Write = { operation: CurrentCommand; values: Record<string, unknown> };
function write(
  parameter: CurrentCatalogParameter | undefined,
  value: unknown,
  operation: CurrentCommand = "setIntegerParameter",
  mode?: number,
): Write {
  if (!parameter)
    throw new Error("This setting is not advertised by the connected camera.");
  if (
    typeof value !== "number" &&
    typeof value !== "string" &&
    typeof value !== "boolean"
  )
    throw new Error("Select a supported value for this camera setting.");
  const selected = selectCurrentParameterValue(parameter, value);
  return {
    operation,
    values: { ...selected, ...(mode === undefined ? {} : { mode }) },
  };
}

/** All values and identifiers come from the selected mode/camera catalog. */
export async function updateTelescopeISPSetting(
  type: string,
  value: number,
  context: ConnectionContextType,
) {
  try {
    const data = await catalog(context);
    const cameraId = type.startsWith("wide") ? 1 : 0;
    const key = type.replace(/^wide/, "").replace(/^./, (c) => c.toLowerCase());
    const camera = data.cameras.find((entry) => entry.cameraId === cameraId);
    const parameter = (name: string) =>
      camera?.parameters.find((entry) => entry.key === name);
    let pending: Write;
    if (key === "exposure" || key === "exposureMode") {
      const exposure = parameter("exp");
      const current =
        cameraId === 0
          ? context.astroSettings.exposure
          : context.astroSettings.wideExposure;
      pending = write(
        exposure,
        key === "exposure"
          ? value
          : typeof current === "number"
            ? current
            : exposure?.currentValue,
        "setExposure",
        key === "exposureMode" ? value : 1,
      );
    } else if (key === "gain" || key === "gainMode") {
      const gain = parameter("gain");
      const current =
        cameraId === 0
          ? context.astroSettings.gain
          : context.astroSettings.wideGain;
      const physical =
        key === "gain"
          ? resolveCurrentCameraGainValue(context, cameraId, value)
          : typeof current === "number"
            ? resolveCurrentCameraGainValue(context, cameraId, current)
            : gain?.currentValue;
      pending = write(
        gain,
        physical,
        "setGain",
        key === "gainMode" ? value : 1,
      );
    } else if (key === "count") {
      const count = camera?.parameters.find((entry) => {
        if (!entry.paramId) return false;
        const id = decodeCurrentParamId(entry.paramId);
        return id.category === 2 && id.paramIndex === 16;
      });
      pending = write(count, value);
    } else if (type === "IR") {
      if (context.typeIdDwarf === undefined)
        throw new Error("Identify the DWARF before selecting a filter.");
      const filter = camera?.parameters.find(
        (entry) =>
          entry.paramId &&
          decodeCurrentParamId(entry.paramId).paramIndex === 13,
      );
      pending = write(
        filter,
        resolveScienceFilterIndex(context.typeIdDwarf, value),
      );
    } else {
      // No legacy feature-number fallback: absent controls are unsupported.
      pending = write(parameter(key), value);
    }
    await socket(context).request(pending.operation, pending.values);
    context.setDeviceError?.(undefined);
  } catch (error) {
    report(context, error);
  }
}

function refreshCamera(
  context: ConnectionContextType,
  cameraId: number,
  modeId: number,
): void {
  const data = getV3NormalizedCameraCatalog(modeId, context);
  const camera = data?.cameras.find((entry) => entry.cameraId === cameraId);
  if (!camera) return;
  const settings: Record<string, unknown> = {};
  for (const parameter of camera.parameters) {
    if (parameter.currentValue === undefined) continue;
    if (
      modeId === 2 &&
      parameter.paramId &&
      typeof parameter.currentValue === "number"
    ) {
      applyAuthoritativeCameraParam(context, {
        paramId: parameter.paramId,
        value: parameter.currentValue,
        mode: parameter.currentMode,
      });
    }
    if (parameter.key === "exp") {
      settings.exp_index = parameter.currentValue;
      if (parameter.currentMode !== undefined)
        settings.exp_mode = parameter.currentMode;
    } else if (parameter.key === "gain") {
      const legacy =
        cameraId === 0
          ? allowedGains[context.typeIdDwarf!]?.values
          : allowedWideGains[context.typeIdDwarf!]?.values;
      const index = legacy?.find(
        (option) => Number(option.name) === parameter.currentValue,
      )?.index;
      if (index !== undefined) settings.gain_index = index;
    } else if (parameter.key === "wb") {
      if (parameter.currentMode !== undefined)
        settings.wb_mode = parameter.currentMode;
      const legacy =
        cameraId === 0
          ? allowedWBColorTemp[context.typeIdDwarf!]?.values
          : allowedWideWBColorTemp[context.typeIdDwarf!]?.values;
      const index = legacy?.find(
        (option) => Number(option.name) === parameter.currentValue,
      )?.index;
      if (index !== undefined) settings.wb_index = index;
    } else if (
      ["brightness", "contrast", "hue", "saturation", "sharpness"].includes(
        parameter.key,
      )
    )
      settings[parameter.key] = parameter.currentValue;
  }
  if (cameraId === 0)
    context.setCameraTeleSettings((current) => ({ ...current, ...settings }));
  else
    context.setCameraWideSettings((current) => ({ ...current, ...settings }));
}

export async function getAllTelescopeISPSetting(
  context: ConnectionContextType,
  _legacySocket?: unknown,
) {
  try {
    await catalog(context);
    refreshCamera(context, 0, 2);
    refreshCamera(context, 1, 2);
  } catch (error) {
    report(context, error);
  }
}

function activeMode(context: ConnectionContextType): number {
  const snapshot = context.socketIPDwarf?.session?.state.snapshot;
  if (!snapshot)
    throw new Error("The device has not reported its current camera mode.");
  // This is a non-optional proto3 scalar: omission in a decoded snapshot is 0.
  const mode = snapshot.shootingMode ?? 0;
  if (mode === 0 || mode === 1) return mode;
  if ([2, 8, 11, 13].includes(mode)) return 2;
  throw new Error("The device has not reported its current camera mode.");
}
export async function getWideAllParamsFn(context: ConnectionContextType) {
  try {
    const mode = activeMode(context);
    await catalog(context, mode);
    refreshCamera(context, 1, mode);
  } catch (error) {
    report(context, error);
  }
}
export async function getTeleAllParamsFn(context: ConnectionContextType) {
  try {
    const mode = activeMode(context);
    await catalog(context, mode);
    refreshCamera(context, 0, mode);
  } catch (error) {
    report(context, error);
  }
}

async function setCameraParameters(
  context: ConnectionContextType,
  cameraId: number,
  selected: Record<string, unknown>,
) {
  try {
    const mode = activeMode(context);
    const data = await catalog(context, mode);
    const parameter = (key: string) =>
      findCurrentCameraParameter(data, cameraId, key);
    const writes: Write[] = [];
    // Validate the whole form before sending its first parameter.
    for (const key of [
      "brightness",
      "contrast",
      "hue",
      "saturation",
      "sharpness",
    ]) {
      if (selected[key] !== undefined)
        writes.push(write(parameter(key), selected[key]));
    }
    if (selected.exp_index !== undefined)
      writes.push(
        write(
          parameter("exp"),
          selected.exp_index,
          "setExposure",
          Number(selected.exp_mode),
        ),
      );
    if (selected.gain_index !== undefined)
      writes.push(
        write(
          parameter("gain"),
          resolveCurrentCameraGainValue(
            context,
            cameraId,
            Number(selected.gain_index),
            mode,
          ),
          "setGain",
          1,
        ),
      );
    if (selected.wb_mode !== undefined) {
      const options =
        cameraId === 0
          ? allowedWBColorTemp[context.typeIdDwarf!]?.values
          : allowedWideWBColorTemp[context.typeIdDwarf!]?.values;
      const value = Number(
        options?.find((option) => option.index === selected.wb_index)?.name,
      );
      writes.push(
        write(
          parameter("wb"),
          value,
          "setWhiteBalance",
          Number(selected.wb_mode),
        ),
      );
    }
    const device = socket(context);
    const generation = device.session?.state.generation;
    for (const pending of writes) {
      if (device.session?.state.generation !== generation)
        throw new Error(
          "The DWARF reconnected while applying settings. Review and retry.",
        );
      await device.request(pending.operation, pending.values);
    }
    context.setDeviceError?.(undefined);
  } catch (error) {
    report(context, error);
  }
}
export async function setWideAllParamsFn(
  context: ConnectionContextType,
  exp_mode,
  exp_index,
  gain_index,
  wb_mode,
  wb_index,
  brightness,
  contrast,
  hue,
  saturation,
  sharpness,
) {
  return setCameraParameters(context, 1, {
    exp_mode,
    exp_index,
    gain_index,
    wb_mode,
    wb_index,
    brightness,
    contrast,
    hue,
    saturation,
    sharpness,
  });
}
export async function setTeleAllParamsFn(
  context: ConnectionContextType,
  wb_mode,
  wb_index_mode,
  wb_index,
  brightness,
  contrast,
  hue,
  saturation,
  sharpness,
) {
  if (wb_index_mode === 1) {
    report(
      context,
      new Error(
        "White-balance scene selection has not been discovered for this camera.",
      ),
    );
    return;
  }
  return setCameraParameters(context, 0, {
    wb_mode,
    wb_index,
    brightness,
    contrast,
    hue,
    saturation,
    sharpness,
  });
}

import { calculateElapsedTime } from "@/lib/date_utils";
import { padNumber } from "@/lib/math_utils";

export function calculateSessionTime(connectionCtx: ConnectionContextType) {
  let data = calculateElapsedTime(
    connectionCtx.imagingSession.startTime,
    Date.now(),
  );
  if (data) {
    return `${padNumber(data.hours)}:${padNumber(data.minutes)}:${padNumber(
      data.seconds,
    )}`;
  }
}

export function get_error(
  errorMessage: string,
  result_data: any,
  setErrorTxt: Function,
) {
  if (
    result_data.data.errorPlainTxt &&
    (typeof result_data.data.errorPlainTxt === "string" ||
      Object.keys(result_data.data.errorPlainTxt).length > 0)
  )
    setErrorTxt(
      (prevError) =>
        (prevError ?? "") + errorMessage + " " + result_data.data.errorPlainTxt,
    );
  else if (
    result_data.data.errorTxt &&
    (typeof result_data.data.errorPlainTxt === "string" ||
      Object.keys(result_data.data.errorTxt).length > 0)
  )
    setErrorTxt(
      (prevError) =>
        (prevError ?? "") + errorMessage + " " + result_data.data.errorTxt,
    );
  else if (result_data.data.code)
    setErrorTxt(
      (prevError) =>
        (prevError ?? "") +
        errorMessage +
        " " +
        "Error: " +
        result_data.data.code,
    );
  else setErrorTxt((prevError) => (prevError ?? "") + " " + "Error");
}
