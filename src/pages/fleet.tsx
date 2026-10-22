import Head from "next/head";
import Link from "next/link";
import DeviceControls from "@/components/fleet/DeviceControls";
import { useContext, useState, useSyncExternalStore } from "react";
import { useFleet, useFleetRegistry } from "@/stores/FleetContext";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { getProxyUrl } from "@/lib/get_proxy_url";
import { offlineRuntime, validFleetHost } from "@/services/fleet/controller";
import type { FleetRegistration } from "@/services/fleet/registry";
import type { DwarfModel } from "@/services/dwarf/deviceProfile";
import styles from "@/styles/fleet.module.css";
import { disconnectSetupDevice } from "@/services/fleet/handoff";
import { storageLabel } from "@/components/fleet/FleetStatusBar";
import { bleNameFromResult } from "@/services/fleet/bleIdentity";

const modelNames = {
  dwarf2: "DWARF 2",
  dwarf3: "DWARF 3",
  dwarfmini: "DWARF Mini",
};

function ModelIcon({ model }: { model?: DwarfModel }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect
        x={model === "dwarfmini" ? 10 : 5}
        y="6"
        width={model === "dwarfmini" ? 20 : 30}
        height="25"
        rx={model === "dwarf2" ? 3 : 8}
      />
      <circle
        cx={model === "dwarfmini" ? 20 : 14}
        cy="16"
        r={model === "dwarf3" ? 6 : 4}
      />
      {model !== "dwarfmini" && <circle cx="28" cy="15" r="2" />}
      <path d="M14 34h12M20 31v3" />
    </svg>
  );
}

function FleetCard({
  device,
  compact = false,
  onOpen,
}: {
  device: FleetRegistration;
  compact?: boolean;
  onOpen?: () => void;
}) {
  const manager = useFleet();
  const registry = useFleetRegistry();
  const legacy = useContext(ConnectionContext);
  const controller = manager.getDevice(device.id);
  const runtime = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    () => offlineRuntime,
  );
  const [alias, setAlias] = useState(device.alias);
  const [hostInput, setHostInput] = useState(device.lastKnownHost ?? "");
  const [bleInput, setBleInput] = useState(device.reportedName ?? "");
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [detecting, setDetecting] = useState(false);
  const [details, setDetails] = useState(true);
  const [changingControl, setChangingControl] = useState(false);
  const [workspace, setWorkspace] = useState(true);
  const setupConnected = Boolean(
    legacy.socketIPDwarf?.isConnected() &&
    legacy.IPDwarf === device.lastKnownHost,
  );
  const busy = ["connected", "connecting", "reconnecting"].includes(
    runtime.connection,
  );
  const act = async (action: () => unknown) => {
    setError(undefined);
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };
  const connect = () =>
    act(async () => {
      if (setupConnected) await disconnectSetupDevice(legacy);
      return manager.connect(device.id, getProxyUrl(legacy), true);
    });
  const redetect = async () => {
    setError(undefined);
    setStatus(undefined);
    if (busy) {
      setError("Disconnect this telescope before updating its address.");
      return;
    }
    if (!device.reportedName) {
      setError(
        "Save its Bluetooth identifier first, or discover it on the Connection setup page.",
      );
      return;
    }
    setDetecting(true);
    try {
      const proxy = getProxyUrl(legacy);
      if (!proxy) throw new Error("The local Bluetooth proxy is unavailable.");
      const endpoint = proxy.includes("/api")
        ? "/api/run-ble"
        : `${proxy}/run-ble`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ble_psd: legacy.BlePWDDwarf || "DWARF_12345678",
          // Redetection reads the device's current network settings; it must
          // not apply a Wi-Fi profile saved for a different telescope.
          ble_STA_ssid: "",
          ble_STA_pwd: "",
          auto_select: device.reportedName,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (response.status === 202)
        throw new Error(
          "The saved Bluetooth identifier was not selected. Check the identifier and retry.",
        );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Bluetooth discovery failed.");
      const foundName = bleNameFromResult(result.details);
      if (
        !foundName ||
        foundName.toLowerCase() !== device.reportedName.toLowerCase()
      ) {
        throw new Error(
          "The detected telescope does not match this Fleet registration. Address was not changed.",
        );
      }
      const nextHost = validFleetHost(result.dwarfIp);
      manager.registry.updateHost(device.id, nextHost);
      setHostInput(nextHost);
      setStatus(`Found ${foundName} at ${nextHost}. Connect to use it.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setDetecting(false);
    }
  };
  if (compact) {
    const status =
      runtime.connection !== "connected"
        ? runtime.connection === "disconnected"
          ? "Offline"
          : runtime.connection
        : runtime.activity === "idle"
          ? "Idle"
          : runtime.activity === "unknown"
            ? "Status unknown"
            : `Working · ${runtime.activity}`;
    return (
      <article aria-label={device.alias}>
        <button
          className={styles.deviceTile}
          onClick={onOpen}
          aria-label={`Open ${device.alias}`}
        >
          <ModelIcon model={runtime.model ?? device.model} />
          <span className={styles.tileIdentity}>
            <strong>{device.alias}</strong>
            <span>
              {runtime.model || device.model
                ? modelNames[(runtime.model ?? device.model)!]
                : "Model not verified"}
            </span>
            <span className={styles.bleIdentifier}>
              {device.reportedName || "BLE identity not linked"}
            </span>
          </span>
          <span
            className={styles.tileStatus}
            data-active={runtime.connection === "connected"}
          >
            {status}
          </span>
          <span aria-hidden="true">›</span>
        </button>
      </article>
    );
  }
  return (
    <article className={styles.card} aria-label={device.alias}>
      <header>
        <ModelIcon model={runtime.model ?? device.model} />
        <div>
          <h2>{device.alias}</h2>
          <span>
            {runtime.model || device.model
              ? modelNames[(runtime.model ?? device.model)!]
              : "Model not verified"}
          </span>
        </div>
        <span className={styles.badge}>{runtime.connection}</span>
      </header>
      <dl>
        <div>
          <dt>Activity</dt>
          <dd>
            {runtime.activity === "unknown"
              ? "Not yet known"
              : runtime.activity}
          </dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>Target unknown</dd>
        </div>
        <div>
          <dt>Frames received</dt>
          <dd>{runtime.frames ?? "—"}</dd>
        </div>
      </dl>
      <div className={styles.telemetry}>
        <span>
          Storage <strong>{storageLabel(runtime.telemetry)}</strong>
        </span>
        <span>
          Battery{" "}
          <strong>
            {runtime.telemetry.batteryPercentage === undefined
              ? "—"
              : `${runtime.telemetry.batteryPercentage}%`}
          </strong>
        </span>
        <span>
          Temperature{" "}
          <strong>
            {runtime.telemetry.temperature === undefined
              ? "Not reported"
              : `${runtime.telemetry.temperature}°C`}
          </strong>
        </span>
      </div>
      {runtime.connection === "connected" && (
        <div className={styles.actions}>
          <span role="status">
            {runtime.ownership === "control"
              ? "You have control"
              : "Monitoring only · request control to use the camera"}
          </span>
          <button
            disabled={changingControl}
            onClick={() => {
              setChangingControl(true);
              void act(() =>
                controller.setControl(runtime.ownership !== "control"),
              ).finally(() => setChangingControl(false));
            }}
          >
            {changingControl
              ? "Waiting for telescope…"
              : runtime.ownership === "control"
                ? "Release control"
                : "Request control"}
          </button>
        </div>
      )}
      <label>
        Observing session
        <select
          value={device.sessionId ?? ""}
          onChange={(event) =>
            void act(() =>
              manager.registry.assignSession(
                device.id,
                event.target.value || undefined,
              ),
            )
          }
        >
          <option value="">No session assigned</option>
          {Object.values(registry.sessions).map((session) => (
            <option key={session.id} value={session.id}>
              {session.name}
            </option>
          ))}
        </select>
      </label>
      <p className={styles.hint}>
        Assignment is planning metadata. It does not start capture or move the
        telescope.
      </p>
      {(error || runtime.error) && (
        <p role="alert" className={styles.error}>
          {error || runtime.error}
        </p>
      )}
      <div className={styles.actions}>
        <button
          onClick={() =>
            busy ? manager.disconnect(device.id) : void connect()
          }
        >
          {busy
            ? "Disconnect"
            : setupConnected
              ? "Use in Fleet & control"
              : "Connect & control"}
        </button>
        {setupConnected && (
          <button onClick={() => void act(() => disconnectSetupDevice(legacy))}>
            Disconnect Setup connection
          </button>
        )}
        <button onClick={() => setDetails(!details)} aria-expanded={details}>
          Device details
        </button>
        <button
          disabled={runtime.connection !== "connected"}
          aria-expanded={workspace}
          onClick={() => setWorkspace(!workspace)}
        >
          {workspace ? "Close workspace" : "Camera and mount"}
        </button>
      </div>
      {workspace && runtime.connection === "connected" && (
        <DeviceControls
          key={`${device.id}:${runtime.generation}`}
          controller={controller}
          canControl={runtime.ownership === "control"}
        />
      )}
      {details && (
        <div className={styles.details}>
          <label>
            Friendly name
            <input
              value={alias}
              maxLength={100}
              onChange={(event) => setAlias(event.target.value)}
            />
          </label>
          <button
            onClick={() =>
              void act(() => manager.registry.rename(device.id, alias))
            }
          >
            Save name
          </button>
          <div className={styles.identityForm}>
            <label>
              Bluetooth identifier
              <input
                value={bleInput}
                onChange={(event) => setBleInput(event.target.value)}
                placeholder="DWARF_mini_6a5316"
              />
            </label>
            <button
              onClick={() =>
                void act(() =>
                  manager.registry.updateReportedName(device.id, bleInput),
                )
              }
            >
              Save identifier
            </button>
          </div>
          <p className={styles.hint}>
            Advertised BLE name: {device.reportedName || "Not linked yet"}.
            Bluetooth setup can fill this automatically.
          </p>
          <div className={styles.identityForm}>
            <label>
              IP address
              <input
                value={hostInput}
                onChange={(event) => setHostInput(event.target.value)}
                placeholder="192.168.178.53"
              />
            </label>
            <button
              disabled={busy || detecting}
              onClick={() =>
                void act(() => {
                  const nextHost = validFleetHost(hostInput);
                  manager.registry.updateHost(device.id, nextHost);
                  setStatus(`Address saved: ${nextHost}`);
                })
              }
            >
              Save address
            </button>
            <button
              disabled={busy || detecting || !device.reportedName}
              onClick={() => void redetect()}
            >
              {detecting
                ? "Detecting via Bluetooth…"
                : "Redetect IP via Bluetooth"}
            </button>
          </div>
          {detecting && (
            <p role="status" className={styles.hint}>
              Scanning for {device.reportedName} and resolving its current
              address. This can take up to two minutes.
            </p>
          )}
          {status && (
            <p role="status" className={styles.success}>
              {status}
            </p>
          )}
          <dl>
            <div>
              <dt>Address</dt>
              <dd>{device.lastKnownHost ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Ownership</dt>
              <dd>{runtime.ownership}</dd>
            </div>
            <div>
              <dt>Last seen</dt>
              <dd>
                {runtime.lastSeen
                  ? new Date(runtime.lastSeen).toLocaleTimeString()
                  : "Not seen in this window"}
              </dd>
            </div>
          </dl>
          <p className={styles.hint}>
            Open Camera and mount for astronomy capture, autofocus and
            coordinate GOTO. Live video, calibration and advanced controls are
            still being migrated from the single-device workspace.
          </p>
          <button
            disabled={busy}
            onClick={() => void act(() => manager.remove(device.id))}
          >
            Remove registration
          </button>
        </div>
      )}
    </article>
  );
}

export default function FleetPage() {
  const manager = useFleet();
  const snapshot = useFleetRegistry();
  const [alias, setAlias] = useState("");
  const [host, setHost] = useState("");
  const [model, setModel] = useState<DwarfModel | "">("");
  const [sessionName, setSessionName] = useState("");
  const [error, setError] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [openedId, setOpenedId] = useState<string>();
  const devices = Object.values(snapshot.devices).sort((a, b) =>
    a.alias.localeCompare(b.alias),
  );
  const opened = openedId && snapshot.devices[openedId];
  if (opened)
    return (
      <section className={styles.page}>
        <Head>
          <title>{opened.alias} · Fleet · Dwarfium</title>
        </Head>
        <header className={styles.heading}>
          <button onClick={() => setOpenedId(undefined)}>
            ← All telescopes
          </button>
          <Link href="/setup-scope/">
            Location, Bluetooth and network setup
          </Link>
        </header>
        <FleetCard key={opened.id} device={opened} />
      </section>
    );
  return (
    <section className={styles.page}>
      <Head>
        <title>Fleet · Dwarfium</title>
      </Head>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>WORKSPACE</span>
          <h1>Your telescope fleet</h1>
          <p>
            {devices.length} registered{" "}
            {devices.length === 1 ? "telescope" : "telescopes"} · Independent
            connections
          </p>
        </div>
        <button onClick={() => setAdding(!adding)} aria-expanded={adding}>
          Add telescope
        </button>
      </header>
      <details className={styles.overviewHelp}>
        <summary>Preview capabilities</summary>
        <p className={styles.notice}>
          Fleet preview: independent monitoring, session assignment and basic
          camera and mount controls. Live video and advanced workflows are still
          being migrated.
        </p>
      </details>
      {adding && (
        <div>
          <p className={styles.notice}>
            <Link href="/setup-scope/">
              Set up a telescope with Bluetooth, Wi-Fi and observing location →
            </Link>
            <br />
            Already know its address? Register it below.
          </p>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              try {
                manager.registry.register({
                  alias,
                  lastKnownHost: validFleetHost(host),
                  model: model || undefined,
                });
                setAlias("");
                setHost("");
                setAdding(false);
                setError(undefined);
              } catch (failure) {
                setError(String(failure));
              }
            }}
          >
            <label>
              Friendly name
              <input
                required
                maxLength={100}
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                placeholder="Garden Mini"
              />
            </label>
            <label>
              IP address
              <input
                required
                value={host}
                onChange={(event) => setHost(event.target.value)}
                placeholder="192.168.178.97"
              />
            </label>
            <label>
              Expected model
              <select
                value={model}
                onChange={(event) =>
                  setModel(event.target.value as DwarfModel | "")
                }
              >
                <option value="">Identify when connecting</option>
                {Object.entries(modelNames).map(([value, name]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Register telescope</button>
            <p className={styles.hint}>
              Registration does not connect or take control. Confirm the address
              belongs to your telescope.
            </p>
          </form>
        </div>
      )}
      <details className={styles.overviewHelp}>
        <summary>Manage observing sessions</summary>
        <form
          className={styles.sessionForm}
          onSubmit={(event) => {
            event.preventDefault();
            try {
              manager.registry.createSession(sessionName);
              setSessionName("");
              setError(undefined);
            } catch (failure) {
              setError(String(failure));
            }
          }}
        >
          <label>
            New observing session
            <input
              required
              maxLength={100}
              value={sessionName}
              onChange={(event) => setSessionName(event.target.value)}
              placeholder="Andromeda night"
            />
          </label>
          <button>Create session</button>
        </form>
      </details>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {!devices.length && (
        <div className={styles.empty}>
          <h2>Start with your first DWARF</h2>
          <p>
            Add a telescope to keep its name and session here, even while it is
            offline.
          </p>
        </div>
      )}
      <div className={styles.grid}>
        {devices.map((device) => (
          <FleetCard
            key={device.id}
            device={device}
            compact
            onOpen={() => {
              manager.registry.select(device.id);
              setOpenedId(device.id);
            }}
          />
        ))}
      </div>
    </section>
  );
}
