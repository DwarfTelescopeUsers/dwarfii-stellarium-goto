import { useState, useEffect } from "react";
import {
  findCurrentCameraParameter,
  type CurrentCameraCatalog,
} from "dwarfii_api";
import type { FleetDeviceController } from "@/services/fleet/controller";
import styles from "@/styles/fleet.module.css";

/** Mounted with a device/session key. Never resolves commands via global selection. */
export default function DeviceControls({
  controller,
  canControl,
}: {
  controller: FleetDeviceController;
  canControl: boolean;
}) {
  const [catalog, setCatalog] = useState<CurrentCameraCatalog>();
  const [camera, setCamera] = useState<0 | 1>(0);
  const [exposure, setExposure] = useState("");
  const [gain, setGain] = useState("");
  const [filter, setFilter] = useState("");
  const [count, setCount] = useState("1");
  const [ra, setRa] = useState("");
  const [dec, setDec] = useState("");
  const [safe, setSafe] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const pending = pendingCount > 0;
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [warning, setWarning] = useState<string>();
  useEffect(() => {
    const update = () => setWarning(controller.getSnapshot().captureWarning);
    update();
    return controller.subscribe(update);
  }, [controller]);
  const run = async (
    action: () => Promise<unknown>,
    success: string | ((result: unknown) => string),
  ) => {
    setPendingCount((n) => n + 1);
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await action();
      setMessage(typeof success === "string" ? success : success(result));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setPendingCount((n) => n - 1);
    }
  };
  const exposureParam =
    catalog && findCurrentCameraParameter(catalog, camera, "exp");
  const gainParam =
    catalog && findCurrentCameraParameter(catalog, camera, "gain");
  const disabled = !canControl || pending;
  return (
    <section className={styles.details} aria-label="Camera and mount workspace">
      <h2>Camera and mount</h2>
      <p className={styles.hint}>
        Commands affect this telescope only. Acknowledged requests are not proof
        of completed capture or movement. Live video is not integrated here yet.
      </p>
      {!canControl && (
        <p role="status">
          Request control on this device card to enable camera and mount
          commands.
        </p>
      )}
      <button
        disabled={pending}
        onClick={() =>
          void run(async () => {
            const discovered = await controller.loadCatalog(2);
            setCatalog(discovered);
            setExposure("");
            setGain("");
          }, "Camera capabilities refreshed.")
        }
      >
        Load camera capabilities
      </button>
      <div className={styles.controlGrid}>
        <label>
          Camera
          <select
            value={camera}
            disabled={pending}
            onChange={(event) => {
              setCamera(Number(event.target.value) as 0 | 1);
              setExposure("");
              setGain("");
              setFilter("");
            }}
          >
            <option value={0}>Telephoto</option>
            <option value={1}>Wide-angle</option>
          </select>
        </label>
        <label>
          Exposure
          <select
            value={exposure}
            disabled={!catalog || pending}
            onChange={(e) => setExposure(e.target.value)}
          >
            <option value="">Select exposure</option>
            {exposureParam?.options
              ?.filter((o) => o.seconds !== undefined)
              .map((o) => (
                <option key={String(o.value)} value={o.seconds}>
                  {o.label}
                </option>
              ))}
          </select>
        </label>
        <label>
          Gain
          <select
            value={gain}
            disabled={!gainParam || pending}
            onChange={(e) => setGain(e.target.value)}
          >
            <option value="">Select gain</option>
            {gainParam?.options
              ?.filter((o) => typeof o.value === "number")
              .map((o) => (
                <option key={String(o.value)} value={String(o.value)}>
                  {o.label}
                </option>
              ))}
          </select>
        </label>
        {camera === 0 && (
          <label>
            Science filter
            <select
              value={filter}
              disabled={pending}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">Select filter</option>
              {controller.getProfile()?.scienceFilters.map((f) => (
                <option key={f.index} value={f.index}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Frame count
          <input
            type="number"
            min="1"
            step="1"
            value={count}
            disabled={pending}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
      </div>
      <div className={styles.actions}>
        {warning && (
          <div role="alert">
            <p>{warning}</p>
            <button
              disabled={disabled}
              onClick={() =>
                void run(
                  () => controller.request("continueCapture"),
                  "Continue requested; awaiting device progress.",
                )
              }
            >
              Continue despite dark-frame warning
            </button>
          </div>
        )}
        <button
          disabled={
            disabled ||
            !exposure ||
            !gain ||
            !count ||
            (camera === 0 && !filter)
          }
          onClick={() =>
            void run(
              () =>
                controller.capture({
                  cameraId: camera,
                  exposureSeconds: Number(exposure),
                  gain: Number(gain),
                  frameCount: Number(count),
                  ...(camera === 0 ? { filterIndex: Number(filter) } : {}),
                }),
              (result) =>
                result &&
                typeof result === "object" &&
                "status" in result &&
                result.status === "completed"
                  ? "Requested frame count reached; capture stopped on the telescope."
                  : "Capture submitted; awaiting device progress.",
            )
          }
        >
          Start astronomy capture
        </button>
        <button
          disabled={!canControl}
          onClick={() =>
            void run(
              () =>
                controller.request(
                  camera === 0 ? "stopTeleCapture" : "stopWideCapture",
                ),
              "Stop capture acknowledged; awaiting device state.",
            )
          }
        >
          Stop capture
        </button>
        <button
          disabled={disabled || camera !== 0}
          onClick={() =>
            void run(
              () => controller.request("astroAutoFocus", { mode: 1 }),
              "Autofocus acknowledged; awaiting focus state.",
            )
          }
        >
          Astro autofocus (telephoto)
        </button>
        <button
          disabled={!canControl}
          onClick={() =>
            void run(
              () => controller.request("stopAstroAutoFocus"),
              "Stop autofocus acknowledged.",
            )
          }
        >
          Stop autofocus
        </button>
      </div>
      <h3 className={styles.controlTitle}>Mount · coordinate GOTO</h3>
      <p className={styles.hint}>
        Requires a calibrated mount. RA is in hours; declination is in degrees.
        Confirm the telescope can move safely and the target is away from the
        Sun.
      </p>
      <div className={styles.controlGrid}>
        <label>
          Right ascension (hours)
          <input
            type="number"
            min="0"
            max="24"
            step="any"
            value={ra}
            onChange={(e) => {
              setRa(e.target.value);
              setSafe(false);
            }}
          />
        </label>
        <label>
          Declination (degrees)
          <input
            type="number"
            min="-90"
            max="90"
            step="any"
            value={dec}
            onChange={(e) => {
              setDec(e.target.value);
              setSafe(false);
            }}
          />
        </label>
      </div>
      <label className={styles.safety}>
        <input
          type="checkbox"
          checked={safe}
          onChange={(e) => setSafe(e.target.checked)}
        />
        I have checked the target and the telescope’s movement path.
      </label>
      <div className={styles.actions}>
        <button
          disabled={disabled || !safe || !ra || !dec}
          onClick={() =>
            void run(
              () => controller.gotoCoordinates(Number(ra), Number(dec)),
              "GOTO acknowledged; awaiting mount state.",
            )
          }
        >
          GOTO coordinates
        </button>
        <button
          disabled={!canControl}
          onClick={() =>
            void run(
              () => controller.request("stopGoto"),
              "Stop GOTO acknowledged; awaiting mount state.",
            )
          }
        >
          Stop GOTO
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
