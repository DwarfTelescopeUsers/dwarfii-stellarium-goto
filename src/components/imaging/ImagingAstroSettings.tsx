import { useContext, useState } from "react";
import type { ChangeEvent } from "react";
import { Formik } from "formik";

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
import { validateAstroSettings } from "@/components/imaging/form_validations";
import { AstroSettings } from "@/types";
import AstroSettingsInfo from "@/components/imaging/AstroSettingsInfo";

type PropTypes = {
  setValidSettings: any;
};

export default function TakeAstroPhoto(props: PropTypes) {
  const { setValidSettings } = props;
  let connectionCtx = useContext(ConnectionContext);
  const [showSettingsInfo, setShowSettingsInfo] = useState(false);

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

  function defaultValueHandler(settingName: keyof AstroSettings) {
    connectionCtx.setAstroSettings((prev) => {
      delete prev[settingName];
      if (settingName === "gain") {
        delete prev["gainMode"];
      }
      if (settingName === "exposure") {
        delete prev["exposureMode"];
      }
      return { ...prev };
    });
    saveAstroSettingsDb(settingName, undefined);
    if (settingName === "gain") {
      saveAstroSettingsDb("gainMode", undefined);
    }
    if (settingName === "exposure") {
      saveAstroSettingsDb("exposureMode", undefined);
    }
  }

  function changeGainHandler(e: ChangeEvent<HTMLSelectElement>) {
    let targetValue = e.target.value;
    if (targetValue === "default") {
      defaultValueHandler("gain");
      return;
    }

    let value: number;
    let modeValue: number;

    if (targetValue === "auto") {
      modeValue = modeAuto;
      value = 0;
    } else {
      modeValue = modeManual;
      value = Number(targetValue);
    }

    connectionCtx.setAstroSettings((prev) => {
      prev["gainMode"] = modeValue;
      return { ...prev };
    });
    saveAstroSettingsDb("gainMode", modeValue.toString());
    updateTelescope("gainMode", modeValue);

    setTimeout(() => {
      connectionCtx.setAstroSettings((prev) => {
        prev["gain"] = value;
        return { ...prev };
      });
      saveAstroSettingsDb("gain", targetValue);
      updateTelescope("gain", value);
    }, 1000);
  }

  function changeExposureHandler(e: ChangeEvent<HTMLSelectElement>) {
    let targetValue = e.target.value;
    if (targetValue === "default") {
      defaultValueHandler("exposure");
      return;
    }

    let value: number;
    let modeValue: number;

    if (targetValue === "auto") {
      modeValue = exposureTelephotoModeAuto;
      value = 0;
    } else {
      modeValue = modeManual;
      value = Number(targetValue);
    }

    connectionCtx.setAstroSettings((prev) => {
      prev["exposureMode"] = modeValue;
      return { ...prev };
    });
    saveAstroSettingsDb("exposureMode", modeValue.toString());
    updateTelescope("exposureMode", modeValue);

    setTimeout(() => {
      connectionCtx.setAstroSettings((prev) => {
        prev["exposure"] = value;
        return { ...prev };
      });
      saveAstroSettingsDb("exposure", targetValue);
      updateTelescope("exposure", value);
    }, 500);
  }

  function changeIRHandler(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "default") {
      defaultValueHandler("IR");
      return;
    }

    let value = Number(e.target.value);
    connectionCtx.setAstroSettings((prev) => {
      prev["IR"] = value;
      return { ...prev };
    });
    saveAstroSettingsDb("IR", e.target.value);
    updateTelescope("IR", value);
  }

  function changeBinningHandler(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "default") {
      defaultValueHandler("binning");
      return;
    }

    let value = Number(e.target.value);
    connectionCtx.setAstroSettings((prev) => {
      prev["binning"] = value;
      return { ...prev };
    });
    saveAstroSettingsDb("binning", e.target.value);
    // TODO: save binning to telescope if DL adds interface to api
  }

  function changeFileFormatHandler(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "default") {
      defaultValueHandler("fileFormat");
      return;
    }

    let value = Number(e.target.value);
    connectionCtx.setAstroSettings((prev) => {
      prev["fileFormat"] = value;
      return { ...prev };
    });
    saveAstroSettingsDb("fileFormat", e.target.value);
    // TODO: save file format to telescope if DL adds interface to api
  }

  function changeCountHandler(e: ChangeEvent<HTMLInputElement>) {
    if (Number(e.target.value) < 1) {
      defaultValueHandler("fileFormat");
      return;
    }

    let value = Number(e.target.value);
    connectionCtx.setAstroSettings((prev) => {
      prev["count"] = value;
      return { ...prev };
    });
    saveAstroSettingsDb("count", e.target.value);
  }

  function setFormattedImagingTime(
    count: number | undefined,
    exposure: number | undefined
  ) {
    if (count === undefined || exposure === undefined) {
      return;
    }

    let minutes = Math.round((count * exposure) / 60);
    if (minutes < 60) {
      return <span>{minutes + " min"}</span>;
    } else {
      let hours = Math.trunc(minutes / 60);
      minutes = minutes % 60;
      return <span>{hours + " h " + minutes + " min"}</span>;
    }
  }

  function toggleShowSettingsInfo() {
    setShowSettingsInfo(!showSettingsInfo);
  }

  const allowedExposures = [
    0.01, 0.1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ];

  const allowedGains = range(30, 150, 10);

  if (showSettingsInfo) {
    return <AstroSettingsInfo onClick={toggleShowSettingsInfo} />;
  }

  return (
    <div>
      <Formik
        initialValues={{
          gain: connectionCtx.astroSettings.gain,
          exposure: connectionCtx.astroSettings.exposure,
          IR: connectionCtx.astroSettings.IR,
          binning: connectionCtx.astroSettings.binning,
          fileFormat: connectionCtx.astroSettings.fileFormat,
          count: connectionCtx.astroSettings.count || 0,
          rightAcension: connectionCtx.astroSettings.rightAcension,
          declination: connectionCtx.astroSettings.declination,
        }}
        validate={(values) => {
          let errors = validateAstroSettings(values);
          if (Object.keys(errors).length === 0) {
            setValidSettings(true);
          } else {
            setValidSettings(false);
          }
          return errors;
        }}
        onSubmit={() => {}}
      >
        {({ values, errors, handleChange, handleBlur, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            <div className="row mb-md-2 mb-sm-1">
              <div className="fs-5 mb-2">
                Camera Settings{" "}
                <i
                  className="bi bi-info-circle"
                  role="button"
                  onClick={toggleShowSettingsInfo}
                ></i>
              </div>

              <div className="col-4">
                <label htmlFor="gain" className="form-label">
                  Gain
                </label>
              </div>
              <div className="col-8">
                <select
                  name="gain"
                  onChange={(e) => {
                    handleChange(e);
                    changeGainHandler(e);
                  }}
                  onBlur={handleBlur}
                  value={values.gain}
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
            <div className="row mb-md-2 mb-sm-1">
              <div className="col-4">
                <label htmlFor="exposure" className="form-label">
                  Exposure
                </label>
              </div>
              <div className="col-8">
                <select
                  name="exposure"
                  onChange={(e) => {
                    handleChange(e);
                    changeExposureHandler(e);
                  }}
                  onBlur={handleBlur}
                  value={values.exposure}
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
            <div className="row mb-md-2 mb-sm-1">
              <div className="col-4">
                <label htmlFor="ir" className="form-label">
                  IR
                </label>
              </div>
              <div className="col-8">
                <select
                  name="IR"
                  onChange={(e) => {
                    handleChange(e);
                    changeIRHandler(e);
                  }}
                  onBlur={handleBlur}
                  value={values.IR}
                >
                  <option value="default">Select</option>
                  <option value="0">Cut</option>
                  <option value="3">Pass</option>
                </select>
              </div>
            </div>
            <div className="row mb-md-2 mb-sm-1">
              <div className="col-4">
                <label htmlFor="binning" className="form-label">
                  Binning
                </label>
              </div>
              <div className="col-8">
                <select
                  name="binning"
                  onChange={(e) => {
                    handleChange(e);
                    changeBinningHandler(e);
                  }}
                  onBlur={handleBlur}
                  value={values.binning}
                >
                  <option value="default">Select</option>
                  <option value="0">1x1</option>
                  <option value="1">2x2</option>
                </select>
              </div>
            </div>
            <div className="row mb-md-2 mb-sm-1">
              <div className="col-4">
                <label htmlFor="fileFormat" className="form-label">
                  Format
                </label>
              </div>
              <div className="col-8">
                <select
                  name="fileFormat"
                  onChange={(e) => {
                    handleChange(e);
                    changeFileFormatHandler(e);
                  }}
                  onBlur={handleBlur}
                  value={values.fileFormat}
                >
                  <option value="default">Select</option>
                  <option value="0">FITS</option>
                  <option value="1">TIFF</option>
                </select>
              </div>
            </div>
            <div className="row mb-md-2 mb-sm-1">
              <div className="col-4">
                <label htmlFor="count" className="form-label">
                  Count
                </label>
              </div>
              <div className="col-8">
                <input
                  type="number"
                  className="form-control"
                  name="count"
                  placeholder="1"
                  min="1"
                  onChange={(e) => {
                    handleChange(e);
                    changeCountHandler(e);
                  }}
                  onBlur={handleBlur}
                  value={values.count}
                />
              </div>
              {errors.count && <p className="text-danger">{errors.count}</p>}
            </div>
            <div className="row mb-md-2 mb-sm-1">
              <div className="col-4">Total time</div>
              <div className="col-8">
                {setFormattedImagingTime(
                  connectionCtx.astroSettings.count,
                  connectionCtx.astroSettings.exposure
                )}
              </div>
            </div>
            {/* {JSON.stringify(values)} */}
          </form>
        )}
      </Formik>
    </div>
  );
}
