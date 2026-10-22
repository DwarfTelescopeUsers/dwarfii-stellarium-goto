import { useContext } from "react";
import PageHeader from "@/components/shared/PageHeader";
import EQSolvingDwarf from "@/components/shared/EQSolving";
import DwarfCameras from "@/components/DwarfCameras";
import { ConnectionContext } from "@/stores/ConnectionContext";

export default function PolarAlignment() {
  const connection = useContext(ConnectionContext);

  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Align"
        title="Polar alignment"
        description="Use the DWARF’s own EQ calibration to measure polar error and get clear mount adjustments."
      />

      <section className="dw-polar-readiness">
        <article className={connection.connectionStatus ? "is-ready" : ""}>
          <i
            className={`bi ${connection.connectionStatus ? "bi-check-circle-fill" : "bi-1-circle"}`}
            aria-hidden="true"
          />
          <div>
            <span>Device</span>
            <strong>
              {connection.connectionStatus
                ? `${connection.typeNameDwarf || "DWARF"} connected`
                : "Connect your DWARF"}
            </strong>
          </div>
        </article>
        <article
          className={
            connection.latitude !== undefined &&
            connection.longitude !== undefined
              ? "is-ready"
              : ""
          }
        >
          <i
            className={`bi ${connection.latitude !== undefined && connection.longitude !== undefined ? "bi-check-circle-fill" : "bi-2-circle"}`}
            aria-hidden="true"
          />
          <div>
            <span>Location</span>
            <strong>
              {connection.latitude !== undefined &&
              connection.longitude !== undefined
                ? `${connection.latitude.toFixed(3)}, ${connection.longitude.toFixed(3)}`
                : "Set observing location"}
            </strong>
          </div>
        </article>
        <article>
          <i className="bi bi-3-circle" aria-hidden="true" />
          <div>
            <span>Mount</span>
            <strong>Level and roughly pole-align</strong>
          </div>
        </article>
      </section>

      <section className="dw-panel dw-polar-workflow">
        <EQSolvingDwarf />
      </section>

      <section className="dw-panel dw-polar-preview">
        <div className="dw-panel-heading">
          <div>
            <p className="dw-eyebrow">Optional visual check</p>
            <h2>Telephoto preview</h2>
            <p>
              Use the live view to confirm clear sky and unobstructed movement.
              The EQ solve—not the camera crosshair—measures alignment.
            </p>
          </div>
          <span className="dw-badge">No external sensor required</span>
        </div>
        {connection.connectionStatus ? (
          <div className="dw-polar-camera-frame">
            <DwarfCameras
              setExchangeCamerasStatus={() => {}}
              showWideangle={false}
              useRawPreviewURL={false}
              showControls={false}
            />
          </div>
        ) : (
          <div className="dw-empty-state dw-empty-state-compact">
            <i
              className="bi bi-camera-video-off dw-empty-state-icon"
              aria-hidden="true"
            />
            <h2>Preview unavailable</h2>
            <p>Connect your DWARF to open the live telephoto preview.</p>
          </div>
        )}
      </section>
    </div>
  );
}
