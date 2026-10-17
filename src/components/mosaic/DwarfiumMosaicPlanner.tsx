import React, { useEffect } from "react";

import { useContext } from "react";
import { useState } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { getMosaicConfig } from "@/lib/mosaic_profile";
import { readMosaicPlan } from "@/lib/mosaic_export";
import NativeMosaicPanel from "./NativeMosaicPanel";

const DwarfiumMosaicPlanner: React.FC = () => {
  const connection = useContext(ConnectionContext);
  const [downloadMessage, setDownloadMessage] = useState("");
  useEffect(() => {
    (window as any).dwarfiumMosaicConfig = getMosaicConfig(
      connection.typeIdDwarf,
      connection.latitude,
      connection.longitude,
    );
    const loadScript = (src: string) => {
      return new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
          `script[src="${src}"]`,
        );
        if (existing) {
          if (existing.dataset.dwarfiumLoaded === "true") resolve();
          else {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener(
              "error",
              () => reject(new Error(`Script load error: ${src}`)),
              { once: true },
            );
          }
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = false; // Voorkom dat scripts tegelijk laden
        script.onload = () => {
          script.dataset.dwarfiumLoaded = "true";
          resolve();
        };
        script.onerror = () => reject(new Error(`Script load error: ${src}`));
        document.body.appendChild(script);
      });
    };

    // Laad de scripts in de juiste volgorde
    const alreadyInitialized =
      document
        .querySelector('script[src="/mosaic/inline.js"]')
        ?.getAttribute("data-dwarfium-loaded") === "true";
    loadScript("https://code.jquery.com/jquery-1.12.1.min.js")
      .then(() => loadScript("/mosaic/aladin.js"))
      .then(() => loadScript("https://www.gstatic.com/charts/loader.js"))
      .then(() => loadScript("/mosaic/DwarfiumMosaicEngine.js"))
      .then(() => loadScript("/mosaic/inline.js"))
      .then(() => {
        if (alreadyInitialized)
          (window as any).startDwarfiumMosaic?.("return to planner");
      })
      .catch((err) => console.error("Error loading scripts:", err));
  }, [connection.typeIdDwarf, connection.latitude, connection.longitude]);

  // Event-handlers (deze gaan ervan uit dat de globale functies beschikbaar zijn)
  const handleViewTarget = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    (window as any).ViewTarget && (window as any).ViewTarget();
  };

  const handleViewImage = (
    e: React.FormEvent<HTMLFormElement>,
    mode: number,
  ) => {
    e.preventDefault();
    (window as any).ViewImage && (window as any).ViewImage(mode);
  };

  const handleSelectChange = (mode: number) => {
    (window as any).ViewImage && (window as any).ViewImage(mode);
  };

  const handleFilterChanged = () => {
    (window as any).filterChanged && (window as any).filterChanged();
  };

  const handleFilterTimeChanged = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    (window as any).filterTimeChanged && (window as any).filterTimeChanged();
  };

  const handleDownload = () => {
    const container = document.getElementById("aladin-div-text");
    if (!container) {
      setDownloadMessage("Create a frame before downloading a plan.");
      return;
    }
    const input = (id: string) =>
      (
        document.getElementById(id) as
          HTMLInputElement | HTMLSelectElement | null
      )?.value ?? "";
    const plan = readMosaicPlan(container, {
      target: input("target"),
      telescope: input("current-telescope"),
      view: input("grid_type"),
      overlapPercent: Number(input("overlap_percentage")),
      gridX: Number(input("size_x")),
      gridY: Number(input("size_y")),
    });
    if (!plan) {
      setDownloadMessage("Create a frame before downloading a plan.");
      return;
    }
    const blob = new Blob([JSON.stringify(plan, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dwarfium-mosaic-plan.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setDownloadMessage("Plan downloaded.");
  };

  return (
    <div id="allDiv" className="all_div">
      <NativeMosaicPanel />
      <div className="new-layout">
        {/* Panel voor observatie-instellingen (1) */}
        <div className="panel panel-left">
          <h2>Observation settings</h2>

          <form
            className="field"
            title="Enter target name or coordinates, click info icon for more info."
            onSubmit={handleViewTarget}
          >
            <label htmlFor="target">Target:</label>
            <div className="input-with-icon">
              <input type="text" id="target" className="input-text" />
              <button
                type="button"
                className="btn-icon"
                onClick={() => alert((window as any).target_info_text)}
                aria-label="Show target format help"
              >
                <img src="/images/information-outline.png" alt="Info" />
              </button>
            </div>
          </form>

          <form className="field" title="Select telescope service.">
            <label htmlFor="current-telescope-service">Service:</label>
            <select
              id="current-telescope-service"
              className="input-select"
              onChange={() => handleSelectChange(1)}
            >
              {/* Opties invullen */}
            </select>
          </form>

          <form className="field" title="Select telescope.">
            <label htmlFor="current-telescope">Telescope:</label>
            <select
              id="current-telescope"
              className="input-select"
              onChange={() => handleSelectChange(2)}
            >
              {/* Opties invullen */}
            </select>
          </form>

          <form
            className="field"
            title="Select grid type: telescope field of view, mosaic grid of separate mosaic panels."
          >
            <label htmlFor="grid_type">View:</label>
            <select
              id="grid_type"
              className="input-select"
              onChange={() => handleSelectChange(0)}
            >
              <option value="fov">FoV</option>
              <option value="mosaic">Mosaic grid</option>
            </select>
          </form>

          <form
            className="field"
            title="Select the panel overlap. A value of 20% is recommended."
            onSubmit={(e) => handleViewImage(e, 0)}
          >
            <label htmlFor="overlap_percentage">Mosaic overlap (%):</label>
            <input
              type="number"
              id="overlap_percentage"
              className="input-number"
              min="1"
              max="100"
            />
          </form>

          <form
            className="field"
            title="Select mosaic grid size."
            onSubmit={(e) => handleViewImage(e, 0)}
          >
            <label>Grid size (x, y):</label>
            <div className="grid-size">
              <input
                type="number"
                id="size_x"
                className="input-small"
                min="1"
                max="10"
              />
              <input
                type="number"
                id="size_y"
                className="input-small"
                min="1"
                max="10"
              />
            </div>
          </form>

          <form
            className="field"
            title="Select date for target visibility view."
            onSubmit={(e) => handleViewImage(e, 0)}
          >
            <label htmlFor="view_date">Date (YYYY-MM-DD):</label>
            <input type="text" id="view_date" className="input-text" />
          </form>
        </div>

        {/* Panel voor catalogus-instellingen (2) */}
        <div className="panel panel-right">
          <h2>Catalog settings</h2>

          <div className="field">
            <label htmlFor="catalog-selection">Catalog:</label>
            <form title="Select catalog.">
              <select
                id="catalog-selection"
                className="input-select"
                onChange={handleFilterChanged}
              >
                {/* Opties invullen */}
              </select>
            </form>
          </div>

          <div className="field">
            <label>Object:</label>
            <div id="catalogDiv" className="catalog-display"></div>
          </div>

          <form
            className="field"
            title="Show only catalog objects that are higher than selected altitude."
          >
            <label htmlFor="catalogFilterDegrees">Altitude:</label>
            <select
              id="catalogFilterDegrees"
              className="input-select"
              onChange={handleFilterChanged}
            >
              <option value="all">All</option>
              <option value="0">0°</option>
              <option value="10">10°</option>
              <option value="20">20°</option>
              <option value="30">30°</option>
              <option value="40">40°</option>
              <option value="50">50°</option>
              <option value="60">60°</option>
              <option value="70">70°</option>
              <option value="80">80°</option>
            </select>
          </form>

          <form
            className="field"
            title="Show only catalog objects that are visible at selected time. Time format is HH:MM."
            onSubmit={handleFilterTimeChanged}
          >
            <label htmlFor="catalogFilterTime">Time:</label>
            <input
              type="text"
              id="catalogFilterTime"
              size={5}
              className="input-text"
            />
          </form>

          <div className="field">
            <label htmlFor="catalogFilterMoon">Moon:</label>
            <form title="Show only catalog objects that are further away from the moon than selected angle.">
              <select
                id="catalogFilterMoon"
                className="input-select"
                onChange={handleFilterChanged}
              >
                <option value="all">All</option>
                <option value="45">45°</option>
                <option value="90">90°</option>
                <option value="135">135°</option>
              </select>
            </form>
          </div>

          <form
            className="field"
            title="If selected, reposition image framing by moving the image using the mouse."
            onSubmit={(e) => handleViewImage(e, 0)}
          >
            <label htmlFor="repositionCheckbox">Reposition:</label>
            <div className="checkbox-area">
              <input type="checkbox" id="repositionCheckbox" />
            </div>
          </form>

          <div className="button-area">
            <button
              title="Refresh current view."
              onClick={() =>
                (window as any).ViewImage && (window as any).ViewImage(0)
              }
              className="btn-refresh-mosaic"
            >
              Refresh
            </button>
            <button
              title="Download data as JSON"
              onClick={handleDownload}
              className="btn-download"
            >
              Download
            </button>
          </div>
          {downloadMessage && <p role="status">{downloadMessage}</p>}
        </div>
      </div>

      <div>
        <p id="startup_info_text"></p>
      </div>
      <div>
        <p id="error_text"></p>
      </div>
      <div id="DivLoadPanels"></div>
      <br />
      <br />
    </div>
  );
};

export default DwarfiumMosaicPlanner;
