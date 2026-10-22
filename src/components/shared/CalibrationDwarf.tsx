import { useState, useContext, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { scheduleDeviceAction } from "@/services/dwarf/operationScope";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { getExposureIndexByName, getGainIndexByName } from "@/lib/data_utils";
import { saveLoggerViewDb, savePiPViewDb } from "@/db/db_utils";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

import {
  calibrationHandler,
  stopGotoHandler,
  shutDownHandler,
  savePositionHandler,
  gotoPositionHandler,
  RingLightsHandlerFn,
  PowerLightsHandlerFn,
  dwarfResetMotorHandlerFn,
  polarAlignHandlerFn,
  polarAlignPositionHandlerFn,
} from "@/lib/goto_utils";
import {
  turnOnTeleCameraFn,
  updateTelescopeISPSetting,
} from "@/lib/dwarf_utils";
import eventBus from "@/lib/event_bus";
import { AstroObject } from "@/types";
import GotoModal from "../astroObjects/GotoModal";

type Message = {
  [k: string]: string;
};
type CalibrationDwarfPropType = {
  setModule: Dispatch<SetStateAction<string | undefined>>;
  setErrors: Dispatch<SetStateAction<string | undefined>>;
  setSuccess: Dispatch<SetStateAction<string | undefined>>;
};

export default function CalibrationDwarf(props: CalibrationDwarfPropType) {
  const { setModule, setErrors, setSuccess } = props;

  let connectionCtx = useContext(ConnectionContext);
  const operationAbort = useRef(new AbortController());
  const generation = connectionCtx.socketIPDwarf?.session?.state.generation;
  useEffect(() => {
    operationAbort.current = new AbortController();
    return () => operationAbort.current.abort();
  }, [connectionCtx.socketIPDwarf, generation]);

  //const [errors, setErrors] = useState<string | undefined>();
  //const [success, setSuccess] = useState<string | undefined>();
  const [position, setPosition] = useState<string | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [gotoMessages, setGotoMessages] = useState<Message[]>([] as Message[]);
  const [showPolarAlign, setShowPolarAlign] = useState(false);
  //const prevErrors = usePrevious(errors);
  //const prevSuccess = usePrevious(success);

  useEffect(() => {
    eventBus.on("clearErrors", () => {
      setErrors(undefined);
    });
    eventBus.on("clearSuccess", () => {
      setSuccess(undefined);
    });
  }, []);

  const { t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    }
  }, []);

  function calibrateFn() {
    setModule(t("cCalibrationDwarfLogProcessCalibration"));
    setShowModal(connectionCtx.loggerView);
    operationAbort.current.abort();
    operationAbort.current = new AbortController();
    const signal = operationAbort.current.signal;
    initCamera(signal);
    scheduleDeviceAction(
      connectionCtx,
      7000,
      (scoped) =>
        calibrationHandler(scoped, setErrors, setSuccess, (options) => {
          setGotoMessages((prev) => prev.concat(options));
        }),
      signal,
    );
  }

  function stopGotoFn() {
    operationAbort.current.abort();
    setModule(t("cCalibrationDwarfLogProcessStopGoto"));
    setShowModal(connectionCtx.loggerView);
    stopGotoHandler(connectionCtx, setErrors, setSuccess, (options) => {
      setGotoMessages((prev) => prev.concat(options));
    });
  }

  function dwarfResetMotorFn() {
    setModule(t("cMotorResetProcess"));
    let polarAlign = false;
    setShowModal(connectionCtx.loggerView);
    dwarfResetMotorHandlerFn(
      polarAlign,
      connectionCtx,
      setErrors,
      setSuccess,
      (options) => {
        setGotoMessages((prev) => prev.concat(options));
      },
    );
  }

  function polarAlignFn() {
    setModule(t("cPolarAlignProcess"));
    setShowModal(connectionCtx.loggerView);
    polarAlignHandlerFn(connectionCtx, setErrors, setSuccess, (options) => {
      setGotoMessages((prev) => prev.concat(options));
    });
  }

  function polarAlignMode90Fn() {
    setModule(t("cLensAlignProcess"));
    setShowModal(connectionCtx.loggerView);
    polarAlignPositionHandlerFn(
      1,
      connectionCtx,
      setErrors,
      setSuccess,
      (options) => {
        setGotoMessages((prev) => prev.concat(options));
      },
    );
  }

  function polarAlignMode0Fn() {
    setModule(t("cLensAlignProcess"));
    setShowModal(connectionCtx.loggerView);
    polarAlignPositionHandlerFn(
      0,
      connectionCtx,
      setErrors,
      setSuccess,
      (options) => {
        setGotoMessages((prev) => prev.concat(options));
      },
    );
  }

  function polarAlignTurnDownFn() {
    setModule(t("cLensTurnDownProcess"));
    setShowModal(connectionCtx.loggerView);
    polarAlignPositionHandlerFn(
      2,
      connectionCtx,
      setErrors,
      setSuccess,
      (options) => {
        setGotoMessages((prev) => prev.concat(options));
      },
    );
  }
  function savePositionFn() {
    savePositionHandler(
      connectionCtx,
      setPosition,
      t("cCalibrationDwarfRecordedPosition"),
      t("cCalibrationDwarfNoPosition"),
    );
  }

  function resetPositionFn() {
    connectionCtx.setIsSavedPosition(false);
    setPosition(t("cCalibrationDwarfNoPosition"));
  }

  function gotoPositionFn() {
    setModule(t("cCalibrationDwarfLogProcessGotoPosition"));
    gotoPositionHandler(
      connectionCtx,
      setPosition,
      setErrors,
      setSuccess,
      (options) => {
        setGotoMessages((prev) => prev.concat(options));
      },
      t("cCalibrationDwarfInitialPosition"),
      t("cCalibrationDwarfNoPosition"),
    );
  }

  function RingLightsOffFn() {
    setModule(t("cCalibrationDwarfLogProcessRingLightsOff"));
    setShowModal(connectionCtx.loggerView);
    RingLightsHandlerFn(true, connectionCtx, setErrors, (options) => {
      setGotoMessages((prev) => prev.concat(options));
    });
  }

  function RingLightsOnFn() {
    setModule(t("cCalibrationDwarfLogProcessRingLightsOn"));
    setShowModal(connectionCtx.loggerView);
    RingLightsHandlerFn(false, connectionCtx, setErrors, (options) => {
      setGotoMessages((prev) => prev.concat(options));
    });
  }

  function PowerLightsOffFn() {
    setModule(t("cCalibrationDwarfLogProcessPowerLightsOff"));
    setShowModal(connectionCtx.loggerView);
    PowerLightsHandlerFn(true, connectionCtx, setErrors, (options) => {
      setGotoMessages((prev) => prev.concat(options));
    });
  }

  function PowerLightsOnFn() {
    setModule(t("cCalibrationDwarfLogProcessPowerLightsOn"));
    setShowModal(connectionCtx.loggerView);
    PowerLightsHandlerFn(false, connectionCtx, setErrors, (options) => {
      setGotoMessages((prev) => prev.concat(options));
    });
  }

  function shutDownFn() {
    setModule(t("cCalibrationDwarfLogProcessShutDown"));
    setShowModal(connectionCtx.loggerView);
    shutDownHandler(false, connectionCtx, setErrors, (options) => {
      setGotoMessages((prev) => prev.concat(options));
    });
  }

  function rebootFn() {
    setModule(t("cCalibrationDwarfLogProcessReboot"));
    setShowModal(connectionCtx.loggerView);
    shutDownHandler(true, connectionCtx, setErrors, (options) => {
      setGotoMessages((prev) => prev.concat(options));
    });
  }

  function toggleLogger() {
    if (connectionCtx.loggerView) {
      saveLoggerViewDb("false");
    } else {
      saveLoggerViewDb("true");
    }

    connectionCtx.setLoggerView((prev) => !prev);
  }

  function togglePiP() {
    if (connectionCtx.PiPView) {
      savePiPViewDb("false");
    } else {
      savePiPViewDb("true");
    }

    connectionCtx.setPiPView((prev) => !prev);
  }

  function initCamera(signal: AbortSignal) {
    {
      scheduleDeviceAction(
        connectionCtx,
        1000,
        (scoped) => {
          turnOnTeleCameraFn(scoped);
        },
        signal,
      );
      scheduleDeviceAction(
        connectionCtx,
        1500,
        (scoped) => {
          updateTelescopeISPSetting("gainMode", 1, scoped);
        },
        signal,
      );
      scheduleDeviceAction(
        connectionCtx,
        2000,
        (scoped) => {
          updateTelescopeISPSetting("exposureMode", 1, scoped);
        },
        signal,
      );
      scheduleDeviceAction(
        connectionCtx,
        2500,
        (scoped) => {
          updateTelescopeISPSetting(
            "gain",
            getGainIndexByName("80", scoped.typeIdDwarf),
            scoped,
          );
        },
        signal,
      );
      scheduleDeviceAction(
        connectionCtx,
        3500,
        (scoped) => {
          updateTelescopeISPSetting(
            "exposure",
            getExposureIndexByName("1", scoped.typeIdDwarf),
            scoped,
          );
        },
        signal,
      );
      scheduleDeviceAction(
        connectionCtx,
        4500,
        (scoped) => {
          updateTelescopeISPSetting("IR", 0, scoped);
        },
        signal,
      );
    }
  }

  function showStatusRingLightsDwarf() {
    if (connectionCtx.statusRingLightsDwarf)
      return (
        <button
          className="dw-calibration-action is-secondary is-active"
          onClick={RingLightsOffFn}
          disabled={!connectionCtx.connectionStatus}
        >
          <span>{t("cCalibrationDwarfLights")}</span>
          <strong>{t("cCalibrationDwarfRingOn")}</strong>
        </button>
      );
    else
      return (
        <button
          className="dw-calibration-action is-secondary"
          onClick={RingLightsOnFn}
          disabled={!connectionCtx.connectionStatus}
        >
          <span>{t("cCalibrationDwarfLights")}</span>
          <strong>{t("cCalibrationDwarfRingOff")}</strong>
        </button>
      );
  }

  function showStatusPowerLightsDwarf() {
    if (connectionCtx.statusPowerLightsDwarf)
      return (
        <button
          className="dw-calibration-action is-secondary is-active"
          onClick={PowerLightsOffFn}
          disabled={
            !connectionCtx.connectionStatus ||
            connectionCtx.statusRingLightsDwarf === undefined
          }
        >
          <span>{t("cCalibrationDwarfLights")}</span>
          <strong>{t("cCalibrationDwarfPowerOn")}</strong>
        </button>
      );
    else
      return (
        <button
          className="dw-calibration-action is-secondary"
          onClick={PowerLightsOnFn}
          disabled={
            !connectionCtx.connectionStatus ||
            connectionCtx.statusPowerLightsDwarf === undefined
          }
        >
          <span>{t("cCalibrationDwarfLights")}</span>
          <strong>{t("cCalibrationDwarfPowerOff")}</strong>
        </button>
      );
  }

  return (
    <div className="dw-calibration-controls">
      <header className="dw-calibration-header">
        <div>
          <h2>
            {t("cCalibrationDwarfTitle", {
              DwarfType: connectionCtx.typeNameDwarf,
            })}
          </h2>
          <p>
            {t("cCalibrationDwarfTitleDesc", {
              DwarfType: connectionCtx.typeNameDwarf,
            })}
          </p>
        </div>
        <div
          className="dw-calibration-view-toggles"
          aria-label="Calibration views"
        >
          <button
            type="button"
            title="Show Logs"
            className={connectionCtx.loggerView ? "active" : ""}
            onClick={toggleLogger}
            aria-label="Show calibration logs"
            aria-pressed={connectionCtx.loggerView}
          >
            <i className="bi bi-info-square" aria-hidden="true" />
            Logs
          </button>
          <button
            type="button"
            title="Show Camera Preview"
            className={connectionCtx.PiPView ? "active" : ""}
            onClick={togglePiP}
            aria-label="Show camera preview"
            aria-pressed={connectionCtx.PiPView}
          >
            <i className="bi bi-pip" aria-hidden="true" />
            Preview
          </button>
        </div>
      </header>

      <div className="dw-calibration-warning" role="note">
        <i className="bi bi-exclamation-triangle" aria-hidden="true" />
        <span>
          <strong>{t("cCalibrationDwarfWarning")}</strong>{" "}
          {t("cCalibrationDwarfWarningDesc")}
        </span>
      </div>

      {!connectionCtx.connectionStatus && (
        <div className="dw-calibration-offline" role="status">
          Connect your DWARF to enable calibration and mount controls.
        </div>
      )}

      <div className="dw-calibration-grid">
        <section className="dw-calibration-group">
          <h3>Mount</h3>
          <p>Calibrate the mount or stop the current movement.</p>
          <div className="dw-calibration-actions">
            <button
              type="button"
              className="dw-calibration-action"
              onClick={calibrateFn}
              disabled={!connectionCtx.connectionStatus}
            >
              {t("CCalibrationDwarfCalibrate")}
            </button>
            <button
              type="button"
              className="dw-calibration-action is-danger"
              onClick={stopGotoFn}
              disabled={!connectionCtx.connectionStatus}
            >
              {t("cCalibrationDwarfStopGoto")}
            </button>
          </div>
        </section>

        <section className="dw-calibration-group">
          <h3>Saved position</h3>
          <p>Store a safe reference position and return to it later.</p>
          <div className="dw-calibration-actions">
            <button
              type="button"
              className="dw-calibration-action is-secondary"
              onClick={savePositionFn}
              disabled={
                !connectionCtx.connectionStatus ||
                !connectionCtx.savePositionStatus
              }
            >
              {t("cCalibrationDwarfSavePosition")}
            </button>
            <button
              type="button"
              className="dw-calibration-action is-secondary"
              onClick={resetPositionFn}
              disabled={
                !connectionCtx.connectionStatus ||
                !connectionCtx.isSavedPosition
              }
            >
              {t("cCalibrationDwarfResetPosition")}
            </button>
            <button
              type="button"
              className="dw-calibration-action"
              onClick={gotoPositionFn}
              disabled={
                !connectionCtx.connectionStatus ||
                !connectionCtx.isSavedPosition
              }
            >
              {t("cCalibrationDwarfGoToPosition")}
            </button>
          </div>
          {position && <p className="dw-calibration-feedback">{position}</p>}
        </section>

        <section className="dw-calibration-group">
          <h3>Device</h3>
          <p>Control illumination or restart the connected DWARF.</p>
          <div className="dw-calibration-actions">
            {showStatusRingLightsDwarf()}
            {showStatusPowerLightsDwarf()}
            <button
              type="button"
              className="dw-calibration-action is-danger"
              onClick={shutDownFn}
              disabled={!connectionCtx.connectionStatus}
            >
              {t("cCalibrationDwarfShutdown")}
            </button>
            <button
              type="button"
              className="dw-calibration-action is-secondary"
              onClick={rebootFn}
              disabled={!connectionCtx.connectionStatus}
            >
              {t("cCalibrationDwarfReboot")}
            </button>
          </div>
        </section>
      </div>

      <details
        className="dw-calibration-advanced"
        open={showPolarAlign}
        onToggle={(event) => setShowPolarAlign(event.currentTarget.open)}
      >
        <summary>
          {showPolarAlign ? "Hide" : "Show"} advanced motor controls
        </summary>
        <p>
          Use these controls for polar alignment and manual lens positioning.
        </p>
        <div className="dw-calibration-actions">
          <button
            type="button"
            className="dw-calibration-action is-secondary"
            onClick={dwarfResetMotorFn}
            disabled={!connectionCtx.connectionStatus}
          >
            {t("cMotorResetAction")}
          </button>
          <button
            type="button"
            className="dw-calibration-action"
            onClick={polarAlignFn}
            disabled={!connectionCtx.connectionStatus}
          >
            {t("cPolarAlignAction")}
          </button>
          <button
            type="button"
            className="dw-calibration-action is-secondary"
            onClick={polarAlignMode90Fn}
            disabled={!connectionCtx.connectionStatus}
          >
            {t("cPolarAlignTo90")}
          </button>
          <button
            type="button"
            className="dw-calibration-action is-secondary"
            onClick={polarAlignMode0Fn}
            disabled={!connectionCtx.connectionStatus}
          >
            {t("cPolarAlignInitial")}
          </button>
          <button
            type="button"
            className="dw-calibration-action is-secondary"
            onClick={polarAlignTurnDownFn}
            disabled={!connectionCtx.connectionStatus}
          >
            {t("cPolarAlignTurnDownLens")}
          </button>
        </div>
      </details>

      <GotoModal
        object={
          {
            displayName: "Calibration",
            ra: "",
            dec: "",
          } as AstroObject
        }
        showModal={showModal}
        setShowModal={setShowModal}
        messages={gotoMessages}
        setMessages={setGotoMessages}
      />
    </div>
  );
}
