import { useContext } from "react";
import type { ChangeEvent } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  wsURL,
  telephotoCamera,
  setExposure,
  setExposureValueCmd,
  setExposureMode,
  setExposureModeCmd,
  setGain,
  setGainValueCmd,
  setGainMode,
  setGainModeCmd,
  setIR,
  setIRCmd,
  modeManual,
  modeAuto,
  exposureTelephotoModeAuto,
  socketSend,
} from "dwarfii_api";
import { range } from "@/lib/math_utils";
import { saveAstroSettingsDb } from "@/db/db_utils";

export default function TakeAstroPhoto() {
  let connectionCtx = useContext(ConnectionContext);

  function updateTelescope(type: string, value: number) {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }
    const socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
    let camera = telephotoCamera;
    let commands = [
      setExposureModeCmd,
      setExposureValueCmd,
      setGainValueCmd,
      setGainModeCmd,
      setIRCmd,
    ];

    socket.addEventListener("open", () => {
      console.log(`start set ${type}...`);
      if (type === "exposure") {
        let payload = setExposure(camera, value);
        socketSend(socket, payload);
      } else if (type === "exposureMode") {
        let payload = setExposureMode(camera, value);
        socketSend(socket, payload);
      } else if (type === "gain") {
        let payload = setGain(camera, value);
        socketSend(socket, payload);
      } else if (type === "gainMode") {
        let payload = setGainMode(camera, value);
        socketSend(socket, payload);
      } else if (type === "IR") {
        let payload = setIR(value);
        socketSend(socket, payload);
      }
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (commands.includes(message.interface)) {
        console.log(`set ${type}:`, message);
      } else {
        console.log(message);
      }
    });

    socket.addEventListener("error", (message) => {
      console.log(`set ${type} error:`, message);
    });
  }

  function changeBinningHandler(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "default") return;

    let value = Number(e.target.value);
    connectionCtx.setAstroSettings((prev) => {
      prev["binning"] = value;
      return prev;
    });
    saveAstroSettingsDb("binning", e.target.value);
    // TODO: save binning to telescope if DL adds interface to api
  }

  function changeExposureHandler(e: ChangeEvent<HTMLSelectElement>) {
    let targetValue = e.target.value;
    if (targetValue === "default") return;

    if (targetValue === "auto") {
      let mode = exposureTelephotoModeAuto;
      connectionCtx.setAstroSettings((prev) => {
        prev["exposureMode"] = mode;
        return prev;
      });
      saveAstroSettingsDb("exposureMode", mode.toString());
    } else {
      let mode = modeManual;
      connectionCtx.setAstroSettings((prev) => {
        prev["exposureMode"] = mode;
        return prev;
      });
      saveAstroSettingsDb("exposureMode", mode.toString());
      updateTelescope("exposureMode", mode);

      setTimeout(() => {
        let value = Number(targetValue);
        connectionCtx.setAstroSettings((prev) => {
          prev["exposure"] = value;
          return prev;
        });
        saveAstroSettingsDb("exposure", targetValue);
        updateTelescope("exposure", value);
      }, 500);
    }
  }

  function changeFileFormatHandler(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "default") return;

    let value = Number(e.target.value);
    connectionCtx.setAstroSettings((prev) => {
      prev["fileFormat"] = value;
      return prev;
    });
    saveAstroSettingsDb("fileFormat", e.target.value);
    // TODO: save file format to telescope if DL adds interface to api
  }

  function changeGainHandler(e: ChangeEvent<HTMLSelectElement>) {
    let targetValue = e.target.value;
    if (targetValue === "default") return;

    if (targetValue === "auto") {
      connectionCtx.setAstroSettings((prev) => {
        prev["gainMode"] = modeAuto;
        return prev;
      });
      saveAstroSettingsDb("gainMode", modeAuto.toString());
      updateTelescope("gainMode", modeAuto);
    } else {
      connectionCtx.setAstroSettings((prev) => {
        prev["gainMode"] = modeManual;
        return prev;
      });
      saveAstroSettingsDb("gainMode", modeManual.toString());
      updateTelescope("gainMode", modeManual);

      setTimeout(() => {
        let value = Number(targetValue);
        connectionCtx.setAstroSettings((prev) => {
          prev["gain"] = value;
          return prev;
        });
        saveAstroSettingsDb("gain", targetValue);
        updateTelescope("gain", value);
      }, 1000);
    }
  }

  function changeIRHandler(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "default") return;

    let value = Number(e.target.value);
    connectionCtx.setAstroSettings((prev) => {
      prev["IR"] = value;
      return prev;
    });
    saveAstroSettingsDb("IR", e.target.value);
    updateTelescope("IR", value);
  }

  function changeCountHandler(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.value === "default") return;

    let value = Number(e.target.value);
    connectionCtx.setAstroSettings((prev) => {
      prev["count"] = value;
      return prev;
    });
    saveAstroSettingsDb("count", e.target.value);
  }

  const allowedExposures = [
    0.0005, 0.001, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    10, 11, 12, 13, 14, 15,
  ];

  const allowedGains = range(0, 150, 10);

  let displayGain =
    connectionCtx.astroSettings.gainMode === 1
      ? connectionCtx.astroSettings.gain
      : "auto";
  let displayExp =
    connectionCtx.astroSettings.exposureMode === 1
      ? connectionCtx.astroSettings.exposure
      : "auto";

  return (
    <div>
      <form>
        <div className="row mb-3">
          <div className="col-sm-4">
            <label htmlFor="gain" className="form-label">
              Gain
            </label>
          </div>
          <div className="col-sm-8">
            <select
              id="gain"
              name="gain"
              onChange={(e) => changeGainHandler(e)}
              defaultValue={displayGain}
            >
              <option value="default">Select</option>
              <option value="auto">Auto</option>
              {allowedGains.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-sm-4">
            <label htmlFor="exposure" className="form-label">
              Exposure (sec)
            </label>
          </div>
          <div className="col-sm-8">
            <select
              id="exposure"
              name="exposure"
              onChange={(e) => changeExposureHandler(e)}
              defaultValue={displayExp}
            >
              <option value="default">Select</option>
              <option value="auto">Auto</option>
              {allowedExposures.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-sm-4">
            <label htmlFor="ir" className="form-label">
              IR
            </label>
          </div>
          <div className="col-sm-8">
            <select
              id="ir"
              name="ir"
              onChange={(e) => changeIRHandler(e)}
              defaultValue={connectionCtx.astroSettings.IR?.toString()}
            >
              <option value="default">Select</option>
              <option value="0">Cut</option>
              <option value="3">Pass</option>
            </select>
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-sm-4">
            <label htmlFor="binning" className="form-label">
              Binning
            </label>
          </div>
          <div className="col-sm-8">
            <select
              id="binning"
              name="binning"
              onChange={(e) => changeBinningHandler(e)}
              defaultValue={connectionCtx.astroSettings.binning?.toString()}
            >
              <option value="default">Select</option>
              <option value="0">1x1</option>
              <option value="1">2x2</option>
            </select>
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-sm-4">
            <label htmlFor="fileFormat" className="form-label">
              File Format
            </label>
          </div>
          <div className="col-sm-8">
            <select
              id="fileFormat"
              name="fileFormat"
              onChange={(e) => changeFileFormatHandler(e)}
              defaultValue={connectionCtx.astroSettings.fileFormat?.toString()}
            >
              <option value="default">Select</option>
              <option value="0">FITS</option>
              <option value="1">TIFF</option>
            </select>
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-sm-4">
            <label htmlFor="count" className="form-label">
              Count
            </label>
          </div>
          <div className="col-sm-8">
            <input
              defaultValue={connectionCtx.astroSettings.count}
              type="number"
              className="form-control"
              id="count"
              name="count"
              placeholder="1"
              required
              onChange={(e) => changeCountHandler(e)}
            />
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-sm-4">
            <label htmlFor="ra" className="form-label">
              Right Acension
            </label>
          </div>
          <div className="col-sm-8">{connectionCtx.astroSettings.ra}</div>
        </div>

        <div className="row mb-3">
          <div className="col-sm-4">
            <label htmlFor="declination" className="form-label">
              Declination
            </label>
          </div>
          <div className="col-sm-8">
            {connectionCtx.astroSettings.declination}
          </div>
        </div>
      </form>
    </div>
  );
}
