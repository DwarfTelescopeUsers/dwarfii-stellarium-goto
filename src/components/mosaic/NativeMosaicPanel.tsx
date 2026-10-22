import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  startCurrentMosaic,
  type NativeMosaicProgress,
} from "@/services/dwarf/mosaic";

export default function NativeMosaicPanel() {
  const context = useContext(ConnectionContext);
  const [horizontalScale, setHorizontalScale] = useState(150);
  const [verticalScale, setVerticalScale] = useState(150);
  const [exposureSeconds, setExposure] = useState(15);
  const [gain, setGain] = useState(80);
  const [count, setCount] = useState(10);
  const [filterIndex, setFilter] = useState(1);
  const [busy, setBusy] = useState(false);
  const [stopReady, setStopReady] = useState(false);
  const [progress, setProgress] = useState<NativeMosaicProgress>();
  const [error, setError] = useState("");
  const stop = useRef<(() => void) | undefined>();
  const identity = useMemo(
    () => ({}),
    [
      context.IPDwarf,
      context.typeIdDwarf,
      context.socketIPDwarf,
      context.socketIPDwarf?.currentClient,
      context.socketIPDwarf?.session?.state.generation,
    ],
  );
  const current = useRef<object | undefined>(identity);
  current.current = identity;
  useEffect(
    () => () => {
      current.current = undefined;
    },
    [],
  );
  useEffect(() => {
    setBusy(false);
    setStopReady(false);
    setProgress(undefined);
    setError("");
    stop.current = undefined;
  }, [identity]);

  async function start() {
    if (busy) return;
    const target = identity;
    setBusy(true);
    setStopReady(false);
    setError("");
    try {
      const run = await startCurrentMosaic(
        context,
        {
          horizontalScale,
          verticalScale,
          exposureSeconds,
          gain,
          count,
          filterIndex,
        },
        (next) => {
          if (current.current === target) setProgress(next);
        },
      );
      if (current.current === target) {
        stop.current = run.stop;
        setStopReady(true);
      }
      await run.completed;
    } catch (reason) {
      if (current.current === target)
        setError(
          reason instanceof Error ? reason.message : "Mosaic request failed.",
        );
    } finally {
      if (current.current === target) {
        setBusy(false);
        setStopReady(false);
        stop.current = undefined;
      }
    }
  }
  const scaleInput = (
    label: string,
    value: number,
    change: (value: number) => void,
  ) => (
    <label>
      {label}
      <select
        value={value}
        onChange={(event) => change(Number(event.target.value))}
        disabled={busy}
      >
        {Array.from({ length: 9 }, (_, index) => 100 + index * 10).map(
          (scale) => (
            <option key={scale} value={scale}>
              {(scale / 100).toFixed(1)}×
            </option>
          ),
        )}
      </select>
    </label>
  );
  return (
    <section className="dw-panel" aria-label="Native mosaic control">
      <h2>Capture a native mosaic</h2>
      <p>
        Target device:{" "}
        <strong>
          {context.typeNameDwarf || "DWARF"}{" "}
          {context.IPDwarf || "not connected"}
        </strong>
        . Center, focus and align your target using Control first. This starts
        the telescope's native mosaic at its current target; the geometry
        planner below exports a separate plan.
      </p>
      <div className="dw-form-grid">
        {scaleInput(
          "Horizontal field scale",
          horizontalScale,
          setHorizontalScale,
        )}
        {scaleInput("Vertical field scale", verticalScale, setVerticalScale)}
        <label>
          Exposure (seconds)
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={exposureSeconds}
            onChange={(event) => setExposure(Number(event.target.value))}
            disabled={busy}
          />
        </label>
        <label>
          Gain
          <input
            type="number"
            min="0"
            step="1"
            value={gain}
            onChange={(event) => setGain(Number(event.target.value))}
            disabled={busy}
          />
        </label>
        <label>
          Native mosaic count
          <input
            type="number"
            min="1"
            step="1"
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            disabled={busy}
          />
        </label>
        <label>
          Telephoto filter
          <select
            value={filterIndex}
            onChange={(event) => setFilter(Number(event.target.value))}
            disabled={busy}
          >
            {context.typeIdDwarf !== 4 && <option value={0}>Visible</option>}
            <option value={1}>Astro</option>
            {context.typeIdDwarf !== 1 && <option value={2}>Duo-Band</option>}
          </select>
        </label>
      </div>
      <p>
        Values are checked against this device's live camera catalogue and read
        back before capture. Native count is a firmware mosaic setting; progress
        below is reported by the telescope.
      </p>
      <div className="dw-action-row">
        <button
          className="dw-button dw-button-primary"
          disabled={
            busy ||
            !context.connectionStatus ||
            context.connectionStatusSlave !== false
          }
          onClick={() => void start()}
        >
          Start mosaic on {context.IPDwarf || "DWARF"}
        </button>
        <button
          className="dw-button dw-button-secondary"
          disabled={!stopReady || context.connectionStatusSlave !== false}
          onClick={() => stop.current?.()}
        >
          Stop mosaic
        </button>
      </div>
      {progress && (
        <p role="status">
          Mosaic {progress.phase}
          {progress.fovId !== undefined
            ? ` · panel ${progress.fovId}/${progress.fovTotal ?? "?"}`
            : ""}
          {progress.currentCount !== undefined
            ? ` · ${progress.currentCount} captured`
            : ""}
          {progress.stackedCount !== undefined
            ? ` · ${progress.stackedCount} stacked`
            : ""}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
