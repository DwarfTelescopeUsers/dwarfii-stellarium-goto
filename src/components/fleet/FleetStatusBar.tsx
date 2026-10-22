import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useFleet, useFleetRegistry } from "@/stores/FleetContext";
import { offlineRuntime } from "@/services/fleet/controller";
import type { FleetRegistration } from "@/services/fleet/registry";

export function storageLabel(telemetry: typeof offlineRuntime.telemetry) {
  return telemetry.storageValid &&
    telemetry.availableSize !== undefined &&
    telemetry.totalSize !== undefined
    ? `${telemetry.availableSize} / ${telemetry.totalSize} GB free`
    : "Unavailable";
}

function DeviceStatus({
  device,
  selected,
}: {
  device: FleetRegistration;
  selected: boolean;
}) {
  const manager = useFleet();
  const controller = manager.getDevice(device.id);
  const runtime = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    () => offlineRuntime,
  );
  const telemetry = runtime.telemetry;
  return (
    <button
      type="button"
      className="dw-fleet-status-device"
      aria-label={`${device.alias} ${runtime.connection} · ${runtime.activity}`}
      aria-pressed={selected}
      onClick={() => manager.registry.select(device.id)}
    >
      <strong>{device.alias}</strong>
      <span>
        {runtime.connection} · {runtime.activity}
      </span>
      <span>
        Battery{" "}
        {telemetry.batteryPercentage === undefined
          ? "Unavailable"
          : `${telemetry.batteryPercentage}%`}{" "}
        · Temperature{" "}
        {telemetry.temperature === undefined
          ? "Not reported"
          : `${telemetry.temperature}°C`}
      </span>
      <span>Storage {storageLabel(telemetry)}</span>
    </button>
  );
}

export default function FleetStatusBar() {
  const manager = useFleet();
  const registry = useFleetRegistry();
  const [connectedIds, setConnectedIds] = useState<string[]>([]);

  useEffect(() => {
    const controllers = Object.keys(registry.devices).map((id) =>
      manager.getDevice(id),
    );
    const update = () => {
      const next = controllers
        .filter(
          (controller) => controller.getSnapshot().connection === "connected",
        )
        .map((controller) => controller.id);
      setConnectedIds((current) =>
        current.length === next.length &&
        current.every((id, index) => id === next[index])
          ? current
          : next,
      );
    };
    const unsubscribe = controllers.map((controller) =>
      controller.subscribe(update),
    );
    update();
    return () => unsubscribe.forEach((stop) => stop());
  }, [manager, registry.devices]);

  useEffect(() => {
    const selected = registry.selectedDeviceId;
    // Connection changes must never change the command destination. Retain an
    // explicitly chosen registered device while offline or reconnecting; its
    // workspace blocks commands until that same telescope is ready again.
    if (selected && registry.devices[selected]) return;
    const next = connectedIds[0];
    if (selected !== next) manager.registry.select(next);
  }, [connectedIds, manager, registry.selectedDeviceId, registry.devices]);

  return (
    <div className="dw-fleet-statusbar" aria-label="Fleet device status">
      <div className="dw-fleet-status-list">
        {connectedIds.length === 0 && (
          <span className="dw-fleet-status-empty">No telescope connected</span>
        )}
        {connectedIds.map((id) => (
          <DeviceStatus
            key={id}
            device={registry.devices[id]}
            selected={registry.selectedDeviceId === id}
          />
        ))}
      </div>
      <Link href="/fleet">Manage fleet</Link>
    </div>
  );
}
