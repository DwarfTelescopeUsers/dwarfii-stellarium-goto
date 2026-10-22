import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { getDwarfDeviceProfile } from "@/services/dwarf/deviceProfile";
import {
  convertDecimalDegreesToDMS,
  convertDecimalHoursToHMS,
  padNumber,
} from "@/lib/math_utils";
import { startGotoHandler } from "@/lib/goto_utils";
import { plannerSkySelectionHref } from "@/lib/observation_planner_transfer";

type SkyTarget = {
  name: string;
  ra: number;
  dec: number;
};

type AladinInstance = {
  addOverlay: (overlay: unknown) => void;
  gotoRaDec: (ra: number, dec: number) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  setFoV: (fov: number) => void;
};

const DEFAULT_FOV = { widthDegrees: 3, heightDegrees: 1.69 };

function formatRa(raDegrees: number) {
  const { hour, minute, second } = convertDecimalHoursToHMS(raDegrees / 15);
  return `${padNumber(hour)}:${padNumber(minute)}:${second.toFixed(2).padStart(5, "0")}`;
}

function formatDec(decDegrees: number) {
  const { negative, degree, minute, second } =
    convertDecimalDegreesToDMS(decDegrees);
  return `${negative ? "-" : "+"}${padNumber(degree)}:${padNumber(minute)}:${second.toFixed(1).padStart(4, "0")}`;
}

function footprintVertices(target: SkyTarget, width: number, height: number) {
  const cosDec = Math.max(Math.cos((target.dec * Math.PI) / 180), 0.15);
  const halfRa = width / 2 / cosDec;
  const halfDec = height / 2;
  return [
    [target.ra - halfRa, target.dec - halfDec],
    [target.ra + halfRa, target.dec - halfDec],
    [target.ra + halfRa, target.dec + halfDec],
    [target.ra - halfRa, target.dec + halfDec],
  ];
}

export default function SkyMap() {
  const connection = useContext(ConnectionContext);
  const aladinRef = useRef<AladinInstance | null>(null);
  const apiRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const [selectedTarget, setSelectedTarget] = useState<SkyTarget | null>(null);
  const [framing, setFraming] = useState(true);
  const [mapCenter, setMapCenter] = useState<SkyTarget>({
    name: "Map center",
    ra: 83.82,
    dec: -5.39,
  });
  const [gotoError, setGotoError] = useState<string>();
  const [gotoSuccess, setGotoSuccess] = useState<string>();
  const [openingPlanner, setOpeningPlanner] = useState(false);
  const activeTarget = selectedTarget ?? mapCenter;

  const deviceProfile = useMemo(() => {
    if (!connection.typeIdDwarf) return null;
    try {
      return getDwarfDeviceProfile(connection.typeIdDwarf);
    } catch {
      return null;
    }
  }, [connection.typeIdDwarf]);
  const fov = deviceProfile?.teleFieldOfView ?? DEFAULT_FOV;

  const drawFootprint = (target: SkyTarget) => {
    const A = apiRef.current;
    const aladin = aladinRef.current;
    if (!A || !aladin) return;
    if (overlayRef.current?.removeAll) overlayRef.current.removeAll();
    if (!overlayRef.current) {
      overlayRef.current = A.graphicOverlay({ color: "#2ee6bd", lineWidth: 3 });
      aladin.addOverlay(overlayRef.current);
    }
    overlayRef.current.addFootprints([
      A.polygon(
        footprintVertices(target, fov.widthDegrees, fov.heightDegrees),
        {
          color: "#2ee6bd",
        },
      ),
    ]);
  };

  useEffect(() => {
    let cancelled = false;
    const container = document.querySelector("#aladin-lite-div");

    const labelControls = () => {
      const labels = [
        "Choose sky survey",
        "Center sky map",
        "Toggle coordinate grid",
        "Copy coordinates",
        "Zoom out",
        "Zoom in",
        "Change projection",
        "Toggle full screen",
      ];
      container?.querySelectorAll("button").forEach((button, index) => {
        if (!button.getAttribute("aria-label")) {
          const label = button.classList.contains("aladin-zoom-out")
            ? "Zoom out"
            : button.classList.contains("aladin-zoom-in")
              ? "Zoom in"
              : button.classList.contains("aladin-location-copy")
                ? "Copy coordinates"
                : labels[index] || `Sky map control ${index + 1}`;
          button.setAttribute("aria-label", label);
          button.setAttribute("title", label);
        }
      });
    };

    const observer = new MutationObserver(labelControls);
    if (container)
      observer.observe(container, { childList: true, subtree: true });

    if (typeof window !== "undefined") {
      import("aladin-lite").then((A) => {
        A.default.init.then(() => {
          if (cancelled || !container) return;
          container.replaceChildren();
          const aladin = A.default.aladin(container, {
            target: "M42",
            // The default DSS2 resolver can select an IRSA mirror that omits
            // CORS headers; use the CDS-hosted HiPS endpoint explicitly.
            survey: "https://alasky.cds.unistra.fr/DSS/DSSColor",
            fov: 3,
            projection: "AIT",
            cooFrame: "equatorial",
            showCooGridControl: true,
            showSimbadPointerControl: true,
            showCooGrid: true,
          });
          apiRef.current = A.default;
          aladinRef.current = aladin;
          if (framing) drawFootprint(activeTarget);
          aladin.on(
            "positionChanged",
            ({ ra, dec }: { ra: number; dec: number }) => {
              setMapCenter({ name: "Map center", ra, dec });
            },
          );
          aladin.on("objectClicked", (source: any) => {
            if (!source) return;
            const ra = Number(source.ra ?? source.data?.ra);
            const dec = Number(source.dec ?? source.data?.dec);
            if (!Number.isFinite(ra) || !Number.isFinite(dec)) return;
            const target = {
              name:
                source.data?.main_id ?? source.data?.name ?? "Atlas selection",
              ra,
              dec,
            };
            source.select?.();
            setSelectedTarget(target);
          });
          labelControls();
        });
      });
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      aladinRef.current = null;
      apiRef.current = null;
      overlayRef.current = null;
      container?.replaceChildren();
    };
  }, []);

  useEffect(() => {
    if (framing) drawFootprint(activeTarget);
    else overlayRef.current?.removeAll?.();
  }, [framing, selectedTarget, mapCenter, fov.widthDegrees, fov.heightDegrees]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectMapCenter = () => setSelectedTarget(mapCenter);

  const centerSelection = () => {
    if (!aladinRef.current) return;
    aladinRef.current.gotoRaDec(activeTarget.ra, activeTarget.dec);
    aladinRef.current.setFoV(Math.max(fov.widthDegrees * 2.2, 3));
  };

  const gotoSelection = async () => {
    if (!connection.connectionStatus || connection.connectionStatusSlave) {
      setGotoError(
        "Connect this DWARF and request control in Fleet before sending a GOTO command.",
      );
      return;
    }
    try {
      await startGotoHandler(
        connection,
        setGotoError,
        setGotoSuccess,
        undefined,
        formatRa(activeTarget.ra),
        formatDec(activeTarget.dec),
        activeTarget.name,
      );
    } catch (error) {
      setGotoSuccess(undefined);
      setGotoError(
        error instanceof Error ? error.message : "Could not send GOTO command.",
      );
    }
  };

  const sendToPlanner = () => {
    if (openingPlanner) return;
    setOpeningPlanner(true);
    window.location.assign(
      plannerSkySelectionHref({
        name: activeTarget.name,
        rightAscension: formatRa(activeTarget.ra),
        declination: formatDec(activeTarget.dec),
        fovWidthDegrees: fov.widthDegrees,
        fovHeightDegrees: fov.heightDegrees,
      }),
    );
  };

  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Explore"
        title="Sky map"
        description="Explore the sky, inspect coordinates and identify targets in an interactive atlas."
      />
      <section className="dw-sky-workspace">
        <div className="dw-panel dw-sky-map">
          <div
            className="dw-sky-map-toolbar"
            role="group"
            aria-label="Sky map view"
          >
            <button
              type="button"
              className={`dw-button ${framing ? "dw-button-secondary" : "dw-button-primary"}`}
              aria-pressed={!framing}
              onClick={() => setFraming(false)}
            >
              All sky
            </button>
            <button
              type="button"
              className={`dw-button ${framing ? "dw-button-primary" : "dw-button-secondary"}`}
              aria-pressed={framing}
              onClick={() => setFraming(true)}
            >
              Framing
            </button>
          </div>
          <div id="aladin-lite-div" />
        </div>
        <aside className="dw-panel dw-sky-inspector">
          <div className="dw-panel-heading">
            <div>
              <p className="dw-eyebrow">Framing</p>
              <h2>Selected target</h2>
            </div>
            <span
              className={`dw-badge ${connection.connectionStatus ? "is-success" : ""}`}
            >
              {deviceProfile?.displayName ?? "No device"}
            </span>
          </div>
          <p className="dw-muted">
            {selectedTarget
              ? "Selected atlas object. Move the map or choose its center to frame another coordinate."
              : "The frame follows the map center. Select an atlas object to lock onto a target."}
          </p>
          <button
            className="dw-button dw-button-secondary dw-button-block"
            onClick={selectMapCenter}
          >
            <i className="bi bi-crosshair" aria-hidden="true" /> Use map center
          </button>
          <div className="dw-sky-target-card">
            <h3>{activeTarget.name}</h3>
            <dl>
              <div>
                <dt>Right ascension</dt>
                <dd>{formatRa(activeTarget.ra)}</dd>
              </div>
              <div>
                <dt>Declination</dt>
                <dd>{formatDec(activeTarget.dec)}</dd>
              </div>
              <div>
                <dt>Telephoto FoV</dt>
                <dd>
                  {fov.widthDegrees.toFixed(2)}° ×{" "}
                  {fov.heightDegrees.toFixed(2)}°
                </dd>
              </div>
            </dl>
            <div className="dw-action-row">
              <button
                className="dw-button dw-button-secondary"
                onClick={centerSelection}
              >
                Preview frame
              </button>
              <button
                className="dw-button dw-button-primary"
                onClick={gotoSelection}
                disabled={
                  !connection.connectionStatus ||
                  connection.connectionStatusSlave
                }
              >
                <i className="bi bi-send" aria-hidden="true" /> GOTO target
              </button>
              <button
                className="dw-button dw-button-secondary"
                onClick={sendToPlanner}
                disabled={openingPlanner}
              >
                <i className="bi bi-calendar-plus" aria-hidden="true" />
                {openingPlanner ? "Opening plan…" : "Add to planner"}
              </button>
            </div>
          </div>
          {(gotoError || gotoSuccess) && (
            <div
              className={`dw-inline-message ${gotoError ? "is-error" : "is-success"}`}
              role="status"
            >
              {gotoError || gotoSuccess}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
