import { useContext, useEffect, useMemo, useState } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { EQSolvingHandlerFn, stopEQSolvingHandler } from "@/lib/goto_utils";

function qualityFor(error: number) {
  const absolute = Math.abs(error);
  if (absolute <= 0.1) return { label: "Excellent", className: "is-excellent" };
  if (absolute <= 0.5) return { label: "Fine tune", className: "is-close" };
  return { label: "Adjustment needed", className: "is-adjust" };
}

export default function EQSolvingDwarf() {
  const connection = useContext(ConnectionContext);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [running, setRunning] = useState(false);
  const { azimuth_err: azimuth, altitude_err: altitude } =
    connection.astroEQSolvingResult;
  const hasResult = azimuth !== undefined && altitude !== undefined;

  useEffect(() => {
    if (error) setRunning(false);
  }, [error]);

  const overallQuality = useMemo(() => {
    if (!hasResult) return null;
    return qualityFor(Math.max(Math.abs(azimuth), Math.abs(altitude)));
  }, [altitude, azimuth, hasResult]);

  const startCalibration = () => {
    setRunning(true);
    setError(undefined);
    setStatus("Starting DWARF EQ calibration…");
    void EQSolvingHandlerFn(connection, setError, setStatus, (message) => {
      if (typeof message === "string") setStatus(message);
      if (
        typeof message === "object" &&
        message?.data &&
        (message.data.aziErr !== undefined || message.data.code !== undefined)
      ) {
        setRunning(false);
      }
    });
  };

  const stopCalibration = () => {
    void stopEQSolvingHandler(connection, setError, setStatus, () =>
      setRunning(false),
    );
  };

  const ready =
    Boolean(connection.connectionStatus) &&
    Boolean(connection.IPDwarf) &&
    connection.latitude !== undefined &&
    connection.longitude !== undefined;

  return (
    <div className="dw-eq-calibration">
      <div className="dw-eq-control-card">
        <div>
          <p className="dw-eyebrow">DWARF calibration</p>
          <h2>{hasResult ? "Alignment result" : "Run EQ calibration"}</h2>
          <p>
            The telescope solves the sky at multiple mount positions and returns
            the polar-axis error. Keep the tripod fixed while it runs.
          </p>
        </div>
        <div className="dw-action-row">
          {running && (
            <button
              className="dw-button dw-button-secondary"
              onClick={stopCalibration}
            >
              Stop
            </button>
          )}
          <button
            className="dw-button dw-button-primary"
            onClick={startCalibration}
            disabled={!ready || running}
          >
            <i
              className={`bi ${running ? "bi-arrow-repeat" : "bi-compass"}`}
              aria-hidden="true"
            />
            {running
              ? "Calibrating…"
              : hasResult
                ? "Run calibration again"
                : "Start EQ calibration"}
          </button>
        </div>
      </div>

      {!ready && (
        <div className="dw-inline-message is-warning" role="status">
          <i className="bi bi-info-circle" aria-hidden="true" />
          {!connection.connectionStatus
            ? "Connect your DWARF to start calibration."
            : "Set your observing location on First steps before calibration."}
        </div>
      )}
      {(error || status) && (
        <div
          className={`dw-inline-message ${error ? "is-error" : running ? "is-progress" : ""}`}
          role={error ? "alert" : "status"}
        >
          {running && <span className="dw-spinner" aria-hidden="true" />}
          {error || status}
        </div>
      )}

      {hasResult ? (
        <div className="dw-eq-results">
          <div className="dw-eq-summary">
            <span className={`dw-alignment-score ${overallQuality?.className}`}>
              <i className="bi bi-bullseye" aria-hidden="true" />
            </span>
            <div>
              <span className={`dw-badge ${overallQuality?.className}`}>
                {overallQuality?.label}
              </span>
              <h3>
                Maximum error{" "}
                {Math.max(Math.abs(azimuth), Math.abs(altitude)).toFixed(2)}°
              </h3>
              <p>
                Make the adjustments below without moving the tripod, then run
                calibration again to verify the result.
              </p>
            </div>
          </div>
          <div className="dw-adjustment-grid">
            <article>
              <div className="dw-adjustment-icon">
                <i
                  className={`bi ${azimuth >= 0 ? "bi-arrow-clockwise" : "bi-arrow-counterclockwise"}`}
                  aria-hidden="true"
                />
              </div>
              <div>
                <span>Azimuth</span>
                <strong>
                  Turn {azimuth >= 0 ? "clockwise" : "counter-clockwise"} by{" "}
                  {Math.abs(azimuth).toFixed(2)}°
                </strong>
                <small>Use the mount’s left/right adjustment.</small>
              </div>
              <span className={`dw-badge ${qualityFor(azimuth).className}`}>
                {qualityFor(azimuth).label}
              </span>
            </article>
            <article>
              <div className="dw-adjustment-icon">
                <i
                  className={`bi ${altitude >= 0 ? "bi-arrow-up" : "bi-arrow-down"}`}
                  aria-hidden="true"
                />
              </div>
              <div>
                <span>Altitude</span>
                <strong>
                  {altitude >= 0 ? "Raise" : "Lower"} the axis by{" "}
                  {Math.abs(altitude).toFixed(2)}°
                </strong>
                <small>Use the mount’s elevation adjustment.</small>
              </div>
              <span className={`dw-badge ${qualityFor(altitude).className}`}>
                {qualityFor(altitude).label}
              </span>
            </article>
          </div>
          <p className="dw-eq-caution">
            <i className="bi bi-lightbulb" aria-hidden="true" />
            If an adjustment moves the error farther away, reverse that axis and
            repeat. Mount orientation can invert a direction.
          </p>
        </div>
      ) : (
        <div className="dw-eq-placeholder">
          <div>
            <span>1</span>
            <strong>Place the mount</strong>
            <small>
              Level the tripod and point the polar axis approximately north or
              south.
            </small>
          </div>
          <i className="bi bi-arrow-right" aria-hidden="true" />
          <div>
            <span>2</span>
            <strong>Run calibration</strong>
            <small>
              Let the DWARF move and plate-solve without touching the mount.
            </small>
          </div>
          <i className="bi bi-arrow-right" aria-hidden="true" />
          <div>
            <span>3</span>
            <strong>Adjust and verify</strong>
            <small>
              Apply the reported corrections and run the solve again.
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
