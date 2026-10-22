import { useContext, useMemo, useState } from "react";

import { getAllTelescopeISPSetting } from "@/lib/dwarf_utils";
import {
  getV3AstroParameterCatalog,
  loadV3AstroParameterCatalog,
  summarizeV3CameraCatalog,
} from "@/services/dwarf/cameraParams";
import { ConnectionContext } from "@/stores/ConnectionContext";

const CAMERA_LABELS: Record<string, string> = {
  exp_mode: "Exposure mode",
  exp_index: "Exposure",
  gain_index: "Gain",
  wb_mode: "White balance mode",
  wb_index_mode: "White balance preset mode",
  wb_index: "White balance",
  brightness: "Brightness",
  contrast: "Contrast",
  hue: "Hue",
  saturation: "Saturation",
  sharpness: "Sharpness",
};

function settingRows(settings: Record<string, unknown>) {
  return Object.entries(settings)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ({
      label: CAMERA_LABELS[key] ?? key,
      value: String(value),
    }));
}

export default function DeviceStatus() {
  const connection = useContext(ConnectionContext);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<Date>();
  const [catalog, setCatalog] = useState(getV3AstroParameterCatalog);
  const [refreshError, setRefreshError] = useState<string>();

  const catalogCameras = useMemo(
    () => summarizeV3CameraCatalog(catalog),
    [catalog],
  );
  const teleSettings = useMemo(() => {
    const current = catalogCameras.find((camera) => camera.cameraId === 0);
    return current?.settings.length
      ? current.settings
      : settingRows(connection.cameraTeleSettings);
  }, [catalogCameras, connection.cameraTeleSettings]);
  const wideSettings = useMemo(() => {
    const current = catalogCameras.find((camera) => camera.cameraId === 1);
    return current?.settings.length
      ? current.settings
      : settingRows(connection.cameraWideSettings);
  }, [catalogCameras, connection.cameraWideSettings]);

  const refresh = async () => {
    setRefreshing(true);
    setRefreshError(undefined);
    try {
      if (connection.IPDwarf) {
        const freshCatalog = await loadV3AstroParameterCatalog(
          connection.IPDwarf,
          connection,
        );
        setCatalog(freshCatalog);
      }
      await getAllTelescopeISPSetting(connection, connection.socketIPDwarf);
      setRefreshedAt(new Date());
    } catch (error) {
      setRefreshError(
        error instanceof Error
          ? error.message
          : "Camera telemetry could not be refreshed.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (!connection.connectionStatus) {
    return (
      <div className="dw-inline-empty">
        <i className="bi bi-activity" aria-hidden="true" />
        <h2>Connect your DWARF to view telemetry</h2>
        <p>
          Live hardware and camera values will appear here when the telescope is
          online.
        </p>
      </div>
    );
  }

  const hardware = [
    { label: "Model", value: connection.typeNameDwarf || "DWARF" },
    { label: "Network address", value: connection.IPDwarf || "Unavailable" },
    {
      label: "Battery",
      value:
        connection.BatteryLevelDwarf === undefined
          ? "Waiting for telemetry"
          : `${connection.BatteryLevelDwarf}%`,
    },
    {
      label: "Temperature",
      value:
        connection.statusTemperatureDwarf === undefined
          ? "Waiting for telemetry"
          : `${connection.statusTemperatureDwarf}°C`,
    },
    {
      label: "Storage",
      value:
        connection.availableSizeDwarf === undefined ||
        connection.totalSizeDwarf === undefined
          ? "Waiting for telemetry"
          : `${connection.availableSizeDwarf}/${connection.totalSizeDwarf} GB free`,
    },
    {
      label: "Control mode",
      value: connection.connectionStatusSlave ? "View only" : "Full control",
    },
  ];

  return (
    <div className="dw-device-status">
      <section className="dw-panel">
        <div className="dw-panel-heading">
          <div>
            <p className="dw-eyebrow">Hardware</p>
            <h2>Live device</h2>
            <p>Values reported by the active telescope connection.</p>
          </div>
          <span className="dw-badge is-ready">
            <i className="bi bi-circle-fill" aria-hidden="true" /> Connected
          </span>
        </div>
        <dl className="dw-status-grid">
          {hardware.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="dw-panel dw-device-camera-panel">
        <div className="dw-panel-heading">
          <div>
            <p className="dw-eyebrow">Camera</p>
            <h2>Active image settings</h2>
            <p>Current values reported for both camera modules.</p>
          </div>
          <button
            type="button"
            className="dw-button is-secondary"
            onClick={refresh}
            disabled={refreshing}
          >
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="dw-camera-status-grid">
          <CameraSettings title="Telephoto" settings={teleSettings} />
          <CameraSettings title="Wide angle" settings={wideSettings} />
        </div>
        {refreshedAt && (
          <p className="dw-status-updated" role="status">
            Requested fresh camera values at {refreshedAt.toLocaleTimeString()}.
          </p>
        )}
        {refreshError && (
          <p className="dw-inline-message is-error" role="alert">
            {refreshError}
          </p>
        )}
      </section>
    </div>
  );
}

function CameraSettings({
  title,
  settings,
}: {
  title: string;
  settings: { label: string; value: string }[];
}) {
  return (
    <article>
      <h3>{title}</h3>
      {settings.length ? (
        <dl>
          {settings.map((setting) => (
            <div key={setting.label}>
              <dt>{setting.label}</dt>
              <dd>{setting.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="dw-muted">
          No camera parameters have been reported yet. Use Refresh after the
          preview has started.
        </p>
      )}
    </article>
  );
}
