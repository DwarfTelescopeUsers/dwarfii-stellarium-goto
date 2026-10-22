import {
  deviceInfo,
  normalizeCurrentDeviceInfo,
  getDefaultParamsConfig,
  getCurrentProfile,
  createCurrentTimedSchedule,
  type CurrentScheduleTransport,
} from "dwarfii_api";
import type { ConnectionContextType } from "@/types";
import { getProxyUrl } from "@/lib/get_proxy_url";
import { DeviceSchedules } from "./schedules";
import {
  buildTimedNativeSchedule,
  type TimedObservationRecipe,
} from "./timedSchedule";
import {
  getV3NormalizedCameraCatalog,
  loadV3AstroParameterCatalog,
} from "./cameraParams";

export function createDeviceSchedules(
  context: ConnectionContextType,
): DeviceSchedules | undefined {
  const host = context.IPDwarf,
    hardwareId = context.typeIdDwarf,
    socket = context.socketIPDwarf;
  if (!host || hardwareId === undefined || !socket) return undefined;
  const generation = socket.session?.state.generation;
  const session = socket.session;
  const sameDevice = () => {
    if (
      context.deviceOperationSignal?.aborted ||
      context.socketIPDwarf !== socket ||
      context.IPDwarf !== host ||
      socket.session?.state.generation !== generation ||
      socket.session !== session ||
      !socket.isConnected()
    )
      throw new Error(
        "Device selection or connection changed during schedule preparation.",
      );
  };
  return new DeviceSchedules(
    socket,
    host,
    hardwareId,
    async () => {
      sameDevice();
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 10_000);
      try {
        const response = await fetch(
          `${getProxyUrl(context)}?target=${encodeURIComponent(deviceInfo(host))}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
            signal: context.deviceOperationSignal
              ? AbortSignal.any([abort.signal, context.deviceOperationSignal])
              : abort.signal,
          },
        );
        if (!response.ok)
          throw new Error(
            `Device identity request failed (${response.status}).`,
          );
        const raw = await response.json();
        const identity = normalizeCurrentDeviceInfo(raw);
        sameDevice();
        // Never retain the discovery response: it also contains Wi-Fi credentials.
        return {
          hardwareId: identity.hardwareId,
          macAddress: raw.data?.macAddress,
        };
      } finally {
        clearTimeout(timer);
      }
    },
    context.deviceOperationSignal,
  );
}

const submitting = new WeakSet<object>();

export async function queueTimedObservation(
  context: ConnectionContextType,
  recipe: TimedObservationRecipe,
  now = Date.now(),
) {
  const device = createDeviceSchedules(context);
  if (!device)
    throw new Error("Select and connect a DWARF before queuing a timed job.");
  const socket = context.socketIPDwarf!;
  if (submitting.has(socket))
    throw new Error("A schedule change is already pending.");
  submitting.add(socket);
  try {
    const session = socket.session;
    const generation = session?.state.generation;
    const began = Date.now();
    const clock = () => Math.floor((now + Date.now() - began) / 1000);
    const check = () => {
      if (
        context.deviceOperationSignal?.aborted ||
        context.IPDwarf !== device.host ||
        context.socketIPDwarf !== socket ||
        socket.session !== session ||
        socket.session?.state.generation !== generation ||
        !socket.isConnected()
      )
        throw new Error(
          "Device selection or connection changed during schedule preparation.",
        );
      if (socket.session?.state.ownership !== "control")
        throw new Error(
          "Request control of this DWARF before changing its schedules.",
        );
    };
    check();
    const identity = await device.identity();
    await loadV3AstroParameterCatalog(device.host, context);
    check();
    const catalog = getV3NormalizedCameraCatalog(2, context);
    if (!catalog)
      throw new Error("The device's live astronomy catalogue is unavailable.");
    const schedule = buildTimedNativeSchedule(
      recipe,
      catalog,
      identity,
      {
        latitude: context.latitude as number,
        longitude: context.longitude as number,
      },
      now,
      (() => {
        let id = 0;
        return () => `validation-${++id}`;
      })(),
    );
    const verified = await device.identity();
    if (
      verified.macAddress.replace(/[:-]/g, "").toLowerCase() !==
      identity.macAddress.replace(/[:-]/g, "").toLowerCase()
    )
      throw new Error("The address now belongs to a different physical DWARF.");
    const response = await fetch(
      `${getProxyUrl(context)}?target=${encodeURIComponent(getDefaultParamsConfig(device.host))}`,
      {
        signal: context.deviceOperationSignal
          ? AbortSignal.any([
              AbortSignal.timeout(10_000),
              context.deviceOperationSignal,
            ])
          : AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok)
      throw new Error("Device scheduling capability request failed.");
    const config = await response.json();
    check();
    if (config.code !== 0)
      throw new Error("Device scheduling capability is unavailable.");
    const transport: CurrentScheduleTransport = {
      profile: getCurrentProfile(device.hardwareId),
      get state() {
        return { session: socket.session!.state };
      },
      async request(operation, values) {
        check();
        const packet = await socket.request(operation, values);
        check();
        return packet;
      },
    };
    const task = JSON.parse(
      (schedule.shootingTasks as { params: string }[])[0].params,
    );
    // Explicit fresh-ID creation avoids D3's silent empty-list handler. It never
    // turns a list timeout into an empty queue, replaces a job, or retries writes.
    const result = await createCurrentTimedSchedule(
      transport,
      {
        ...verified,
        protocolVersion: {
          majorVersion: config.data?.majorVersion,
          minorVersion: config.data?.minorVersion,
        },
      },
      catalog,
      {
        name: recipe.name,
        latitude: context.latitude as number,
        longitude: context.longitude as number,
        timezone:
          context.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        autofocus: recipe.autofocus,
        planningTimeSeconds: clock(),
        tasks: [
          {
            target: recipe.target,
            rightAscensionHours: task.ra,
            declinationDegrees: task.dec,
            startTimeSeconds: task.startTime,
            endTimeSeconds: task.endTime,
            exposureSeconds: recipe.exposureSeconds,
            gain: recipe.gain,
            filterIndex: task.filterModeIndex,
          },
        ],
      },
      clock,
    );
    return {
      scheduleId: result.schedule.scheduleId,
      schedules: [result.schedule],
    };
  } finally {
    submitting.delete(socket);
  }
}
