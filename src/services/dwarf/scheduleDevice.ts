import { deviceInfo, normalizeCurrentDeviceInfo } from "dwarfii_api";
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

export async function queueTimedObservation(
  context: ConnectionContextType,
  recipe: TimedObservationRecipe,
  now = Date.now(),
) {
  const device = createDeviceSchedules(context);
  if (!device)
    throw new Error("Select and connect a DWARF before queuing a timed job.");
  // Read native state first. A query timeout is a failure, not an
  // empty queue or permission to send an unverified schedule write.
  await device.list();
  const identity = await device.identity();
  await loadV3AstroParameterCatalog(device.host, context);
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
  );
  const schedules = await device.sync(
    {
      format: "dwarfium-native-schedule-v1",
      host: device.host,
      hardwareId: device.hardwareId,
      schedule,
    },
    now,
  );
  if (!schedules.some((entry) => entry.scheduleId === schedule.scheduleId))
    throw new Error(
      "The device did not confirm the new timed job in its schedule list. Read device schedules before retrying.",
    );
  return { scheduleId: schedule.scheduleId, schedules };
}
