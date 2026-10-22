import Link from "next/link";
import { useContext } from "react";

import ConnectDwarfII from "@/components/setup/ConnectDwarfII";
import { ConnectionContext } from "@/stores/ConnectionContext";

function Metric({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <span className="dw-status-metric" title={`${label}: ${value}`}>
      <i className={`bi ${icon}`} aria-hidden="true" />
      <span className="dw-status-metric-label">{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

export default function StatusBar() {
  const connection = useContext(ConnectionContext);
  const connected = connection.connectionStatus === true;
  const telemetryPending = connected ? "Waiting" : "—";
  const connectionLabel = connected
    ? connection.connectionStatusSlave
      ? "Connected · observer"
      : "Connected · control"
    : connection.connectionStatus === false
      ? "Connection unavailable"
      : "Not connected";

  const storage =
    connection.availableSizeDwarf !== undefined && connection.totalSizeDwarf
      ? `${connection.availableSizeDwarf}/${connection.totalSizeDwarf} GB`
      : "—";
  const target = connection.astroSettings?.target || "No target";
  const isCapturing =
    connected &&
    Boolean(
      connection.imagingSession?.isRecording ||
      connection.imagingSession?.isGoLive,
    );

  return (
    <div className="dw-statusbar" aria-label="Device status" aria-live="polite">
      <div className="dw-status-primary">
        <span
          className={`dw-connection-state ${connected ? "is-online" : "is-offline"}`}
        >
          <span className="dw-status-dot" aria-hidden="true" />
          <span>
            <strong>{connection.typeNameDwarf || "DWARF"}</strong>
            <small>{connectionLabel}</small>
          </span>
        </span>
        {!connected && <ConnectDwarfII />}
      </div>

      <div className="dw-status-metrics">
        <Metric
          icon="bi-battery-half"
          label="Battery"
          value={
            connected && connection.BatteryLevelDwarf !== undefined
              ? `${connection.BatteryLevelDwarf}%`
              : telemetryPending
          }
        />
        <Metric
          icon="bi-thermometer-half"
          label="Temperature"
          value={
            connected && connection.statusTemperatureDwarf !== undefined
              ? `${connection.statusTemperatureDwarf}°C`
              : telemetryPending
          }
        />
        <Metric
          icon="bi-sd-card"
          label="Storage"
          value={connected && storage !== "—" ? storage : telemetryPending}
        />
        <Metric icon="bi-crosshair" label="Target" value={target} />
        {isCapturing && (
          <span className="dw-capture-indicator">
            <span className="dw-status-dot" aria-hidden="true" />
            Capturing · {connection.imagingSession.imagesTaken ?? 0} frames
          </span>
        )}
      </div>

      <Link
        href="/setup-scope"
        className="dw-status-settings"
        aria-label="Open connection settings"
      >
        <i className="bi bi-sliders" aria-hidden="true" />
      </Link>
    </div>
  );
}
