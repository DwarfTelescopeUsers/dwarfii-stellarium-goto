import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  DeviceSchedules,
  type NativeSchedule,
} from "@/services/dwarf/schedules";
import { createDeviceSchedules } from "@/services/dwarf/scheduleDevice";

const states = ["Initialized", "Pending", "Shooting", "Completed", "Expired"];

export default function DeviceSchedulePanel() {
  const context = useContext(ConnectionContext);
  const socket = context.socketIPDwarf;
  const generation = socket?.session?.state.generation;
  const device = useMemo(
    () => createDeviceSchedules(context),
    [
      socket,
      socket?.currentClient,
      generation,
      context.IPDwarf,
      context.typeIdDwarf,
    ],
  );
  const current = useRef(device);
  current.current = device;
  useEffect(
    () => () => {
      current.current = undefined;
    },
    [],
  );
  const [rows, setRows] = useState<NativeSchedule[] | undefined>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setRows(undefined);
    setBusy(false);
    setMessage("");
    setPassword("");
  }, [device]);

  async function run(
    action: (target: DeviceSchedules) => Promise<NativeSchedule[]>,
  ) {
    if (!device || busy) return;
    const target = device;
    setBusy(true);
    setMessage("");
    try {
      const result = await action(target);
      if (current.current === target) setRows(result);
    } catch (error) {
      if (current.current === target) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Device schedule request failed.",
        );
        // A failed read cannot establish that there are zero device schedules.
        setRows(undefined);
      }
    } finally {
      if (current.current === target) setBusy(false);
    }
  }

  function exportSchedule(id: string) {
    if (!device) return;
    try {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(device.export(id), null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "dwarfium-native-schedule.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    }
  }

  return (
    <section className="dw-planner-card" aria-label="Device scheduler">
      <h3>Device scheduler</h3>
      <p>
        Selected device:{" "}
        <strong>
          {context.typeNameDwarf || "DWARF"}{" "}
          {context.IPDwarf || "not connected"}
        </strong>
      </p>
      <p>
        Read and manage schedules stored on this telescope. Native schedules run
        on the device, including after this page closes. Saved observation
        recipes below are local plans until explicitly submitted.
      </p>
      <p>
        Native tasks use start and end times. Their count fields report
        progress; they do not guarantee a requested number of frames. Import
        accepts the native device export format, with version 1 task parameters
        and future times, for this same device.
      </p>
      <div className="dw-action-row">
        <button
          className="dw-button dw-button-secondary"
          disabled={!device || busy || !context.connectionStatus}
          onClick={() => void run((target) => target.list())}
        >
          {busy ? "Waiting for device…" : "Read device schedules"}
        </button>
        <button
          className="dw-button dw-button-secondary"
          disabled={
            !device ||
            busy ||
            rows === undefined ||
            context.connectionStatusSlave !== false
          }
          onClick={() => importRef.current?.click()}
        >
          Submit native schedule JSON
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file)
              void run(async (target) => {
                const parsed = JSON.parse(await file.text());
                if (current.current !== target)
                  throw new Error(
                    "The selected device changed before import. Select the file again.",
                  );
                return target.sync(parsed);
              });
          }}
        />
      </div>
      {message && (
        <p role="alert">
          {message} Schedule state is unverified; read again before retrying a
          change.
        </p>
      )}
      {rows !== undefined && (
        <>
          {rows.length === 0 ? (
            <p>The device returned no schedules.</p>
          ) : (
            <>
              <label>
                Schedule password (if locked)
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="off"
                />
              </label>
              <ul>
                {rows.map((row) => (
                  <li key={row.scheduleId}>
                    <strong>{row.scheduleName || row.scheduleId}</strong> ·{" "}
                    {states[row.state ?? 0] || "Unknown state"}
                    <button
                      className="dw-text-button"
                      onClick={() => exportSchedule(row.scheduleId)}
                      disabled={busy}
                    >
                      Export native JSON
                    </button>
                    {[0, 1, 2].includes(row.state ?? 0) && (
                      <button
                        className="dw-text-button"
                        disabled={
                          busy || context.connectionStatusSlave !== false
                        }
                        onClick={() =>
                          void run((target) =>
                            target.cancel(row.scheduleId, password),
                          )
                        }
                      >
                        Cancel on {context.IPDwarf}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
