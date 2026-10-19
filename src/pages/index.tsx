import Head from "next/head";
import Link from "next/link";
import { useContext } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";

const quickActions = [
  {
    href: "/cameras",
    icon: "bi-camera-video",
    label: "Open camera",
    detail: "Preview, focus and capture",
  },
  {
    href: "/objects",
    icon: "bi-crosshair",
    label: "Choose a target",
    detail: "Browse and start GOTO",
  },
  {
    href: "/scheduler",
    icon: "bi-calendar-check",
    label: "Plan a session",
    detail: "Build an observing sequence",
  },
  {
    href: "/image-session",
    icon: "bi-images",
    label: "Review sessions",
    detail: "Browse and edit captures",
  },
];

export default function Home() {
  const connection = useContext(ConnectionContext);
  const connected = connection.connectionStatus === true;
  const hasLocation =
    connection.latitude !== undefined && connection.longitude !== undefined;
  const storagePercent =
    connection.availableSizeDwarf !== undefined && connection.totalSizeDwarf
      ? Math.round(
          (connection.availableSizeDwarf / connection.totalSizeDwarf) * 100,
        )
      : undefined;
  const sessionActive = Boolean(
    connection.imagingSession?.isRecording ||
    connection.imagingSession?.isGoLive,
  );

  return (
    <>
      <Head>
        <title>Dwarfium · Observatory dashboard</title>
      </Head>
      <div className="dw-page">
        <header className="dw-page-header">
          <div>
            <p className="dw-eyebrow">Observatory console</p>
            <h1>Good evening</h1>
            <p>
              Connect your DWARF, check observing readiness and continue your
              session from one focused workspace.
            </p>
          </div>
          <div className="dw-header-actions">
            <Link className="dw-button is-secondary" href="/forecast">
              <i className="bi bi-cloud-moon" aria-hidden="true" />
              Conditions
            </Link>
            <Link
              className="dw-button"
              href={connected ? "/cameras" : "/fleet"}
            >
              <i
                className={`bi ${connected ? "bi-camera-video" : "bi-router"}`}
                aria-hidden="true"
              />
              {connected ? "Start observing" : "Set up device"}
            </Link>
          </div>
        </header>

        <div className="dw-dashboard-grid">
          <section className="dw-panel is-device">
            <div className="dw-panel-header">
              <div>
                <h2>Device</h2>
                <p>{connection.typeNameDwarf || "DWARF telescope"}</p>
              </div>
              <span className="dw-panel-icon">
                <i className="bi bi-router" aria-hidden="true" />
              </span>
            </div>
            <div className="dw-metric-grid">
              <div className="dw-metric-card">
                <span>Connection</span>
                <strong>{connected ? "Online" : "Offline"}</strong>
              </div>
              <div className="dw-metric-card">
                <span>Battery</span>
                <strong>
                  {connected && connection.BatteryLevelDwarf !== undefined
                    ? `${connection.BatteryLevelDwarf}%`
                    : "—"}
                </strong>
              </div>
              <div className="dw-metric-card">
                <span>Temperature</span>
                <strong>
                  {connected && connection.statusTemperatureDwarf !== undefined
                    ? `${connection.statusTemperatureDwarf}°C`
                    : "—"}
                </strong>
              </div>
              <div className="dw-metric-card">
                <span>Storage free</span>
                <strong>
                  {storagePercent !== undefined ? `${storagePercent}%` : "—"}
                </strong>
              </div>
              <div className="dw-metric-card">
                <span>Control mode</span>
                <strong>
                  {connected
                    ? connection.connectionStatusSlave
                      ? "Observer"
                      : "Host"
                    : "—"}
                </strong>
              </div>
              <div className="dw-metric-card">
                <span>Address</span>
                <strong>{connection.IPDwarf || "—"}</strong>
              </div>
            </div>
          </section>

          <section className="dw-panel is-session">
            <div className="dw-panel-header">
              <div>
                <h2>Observing readiness</h2>
                <p>The essentials for a successful capture session</p>
              </div>
              <span className="dw-panel-icon">
                <i className="bi bi-stars" aria-hidden="true" />
              </span>
            </div>
            <ul className="dw-readiness-list">
              <li>
                <span>DWARF connection</span>
                <span
                  className={`dw-badge ${connected ? "is-ready" : "is-warning"}`}
                >
                  <i
                    className={`bi ${connected ? "bi-check-circle" : "bi-exclamation-circle"}`}
                    aria-hidden="true"
                  />
                  {connected ? "Ready" : "Action needed"}
                </span>
              </li>
              <li>
                <span>Observing location</span>
                <span
                  className={`dw-badge ${hasLocation ? "is-ready" : "is-warning"}`}
                >
                  <i
                    className={`bi ${hasLocation ? "bi-check-circle" : "bi-geo-alt"}`}
                    aria-hidden="true"
                  />
                  {hasLocation ? "Set" : "Not set"}
                </span>
              </li>
              <li>
                <span>Stellarium link</span>
                <span
                  className={`dw-badge ${connection.connectionStatusStellarium ? "is-ready" : ""}`}
                >
                  {connection.connectionStatusStellarium
                    ? "Connected"
                    : "Optional"}
                </span>
              </li>
              <li>
                <span>Imaging session</span>
                <strong>
                  {sessionActive
                    ? `${connection.imagingSession.imagesTaken ?? 0} frames captured`
                    : "Idle"}
                </strong>
              </li>
              <li>
                <span>Current target</span>
                <strong>
                  {connection.astroSettings?.target || "None selected"}
                </strong>
              </li>
            </ul>
          </section>

          <section className="dw-panel is-actions">
            <div className="dw-panel-header">
              <div>
                <h2>Quick actions</h2>
                <p>Jump back into your observing workflow</p>
              </div>
            </div>
            <div className="dw-quick-actions">
              {quickActions.map((action) => (
                <Link
                  href={action.href}
                  className="dw-quick-action"
                  key={action.href}
                >
                  <i className={`bi ${action.icon}`} aria-hidden="true" />
                  <span>
                    <strong>{action.label}</strong>
                    <small>{action.detail}</small>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="dw-panel is-conditions">
            <div className="dw-panel-header">
              <div>
                <h2>Tonight</h2>
                <p>Planning context</p>
              </div>
              <span className="dw-panel-icon">
                <i className="bi bi-moon-stars" aria-hidden="true" />
              </span>
            </div>
            <ul className="dw-readiness-list">
              <li>
                <span>Location</span>
                <strong>
                  {hasLocation
                    ? `${Number(connection.latitude).toFixed(2)}°, ${Number(connection.longitude).toFixed(2)}°`
                    : "Set location"}
                </strong>
              </li>
              <li>
                <span>Timezone</span>
                <strong>{connection.timezone || "Local"}</strong>
              </li>
              <li>
                <span>Forecast</span>
                <Link href="/forecast">
                  View conditions{" "}
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <span>Astronomy events</span>
                <Link href="/astro-calendar">
                  Open calendar{" "}
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
