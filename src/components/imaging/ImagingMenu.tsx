import { useContext, useState, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction, MouseEvent } from "react";
import Modal from "react-bootstrap/Modal";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { startCurrentAstroCapture } from "@/services/dwarf";
import { captureWarning } from "@/services/dwarf/captureCommands";
import ImagingAstroSettings from "@/components/imaging/ImagingAstroSettings";
import RecordingButton from "@/components/icons/RecordingButton";
import RecordButton from "@/components/icons/RecordButton";
import { validateAstroSettings } from "@/components/imaging/form_validations";
import { ImagingSession } from "@/types";
import { saveImagingSessionDb, removeImagingSessionDb } from "@/db/db_utils";
import CameraAddOn from "@/components/imaging/CameraAddOn";
import {
  wideangleCamera,
  turnOnTeleCameraFn,
  turnOnWideCameraFn,
  calculateSessionTime,
  updateTelescopeISPSetting,
} from "@/lib/dwarf_utils";
import styles from "@/components/imaging/ImagingMenu.module.css";

type PropType = {
  exchangeCamerasStatus: boolean;
  setShowWideangle: Dispatch<SetStateAction<boolean>>;
  setUseRawPreviewURL: Dispatch<SetStateAction<boolean>>;
};

export default function ImagingMenu(props: PropType) {
  const { exchangeCamerasStatus, setShowWideangle, setUseRawPreviewURL } =
    props;
  let connectionCtx = useContext(ConnectionContext);
  const [showWideAngle, setShowWideAngle] = useState(false);
  const [astroFocus, setAstroFocus] = useState(false);
  const [focusRequested, setFocusRequested] = useState(false);
  const [focusStatus, setFocusStatus] = useState("");
  const [captureStatus, setCaptureStatus] = useState("");
  const [warning, setWarning] = useState<string>();
  const [captureBusy, setCaptureBusy] = useState(false);
  const capturePending = useRef(false);
  const stopCapturePending = useRef(false);
  const pendingCaptureTime = useRef<number | undefined>(undefined);
  const continuousFocusHeld = useRef(false);
  const pendingFocusCommands = useRef(new Set<string>());
  const focusStopRequested = useRef(false);
  const focusNotificationRevision = useRef(0);
  const captureNotificationRevision = useRef(0);
  const sessionRevision = useRef(0);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [validSettings, setValidSettings] = useState(isValid());
  const [showModal, setShowModal] = useState(false);
  const [screenWidth, setScreenWidth] = useState<number>(() =>
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );

  let timerSession: ReturnType<typeof setInterval>;
  let timerSessionInit: boolean = connectionCtx.timerGlobal !== undefined;

  // Track screen resize
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const socket = connectionCtx.socketIPDwarf;
    const sender = "ImagingMenu:operation-state";
    let mounted = true;
    const reset = () => {
      sessionRevision.current += 1;
      pendingFocusCommands.current.clear();
      continuousFocusHeld.current = false;
      focusStopRequested.current = false;
      capturePending.current = false;
      stopCapturePending.current = false;
      pendingCaptureTime.current = undefined;
      setFocusRequested(false);
      setAstroFocus(false);
      setCaptureBusy(false);
      setWarning(undefined);
    };
    reset();
    setFocusStatus("");
    setCaptureStatus("");
    if (socket?.prepare) {
      void socket.prepare(
        undefined,
        sender,
        [15278, 15280, 15257, 15208, 15236, 11005, 11016, 11050],
        (_sender, packet) => {
          if (
            mounted &&
            packet.known &&
            packet.type === 1 &&
            [11005, 11016, 11050].includes(packet.cmd)
          ) {
            const warning = captureWarning(packet.data.code);
            if (warning) setWarning(warning);
            return;
          }
          if (!mounted || !packet.known || ![2, 3].includes(packet.type))
            return;
          const data = packet.data;
          if ([15278, 15280].includes(packet.cmd)) {
            focusNotificationRevision.current += 1;
            const state = data.state ?? 0;
            if (state === 1) {
              setAstroFocus(true);
              setFocusStatus("Autofocus in progress.");
            } else if (state === 2) {
              setAstroFocus(true);
              setFocusStatus("Autofocus is stopping.");
            } else if (state === 0 || state === 3) {
              setAstroFocus(false);
              setFocusRequested(false);
              setFocusStatus(
                state === 0
                  ? "Autofocus idle."
                  : focusStopRequested.current
                    ? "Autofocus stopped."
                    : "Autofocus complete.",
              );
              focusStopRequested.current = false;
            }
          } else if (packet.cmd === 15257) {
            focusNotificationRevision.current += 1;
            connectionCtx.setValueFocusDwarf(data.pos ?? 0);
          } else {
            captureNotificationRevision.current += 1;
            const state = data.state ?? 0;
            if (state === 1) {
              setCaptureStatus("Capture running.");
              const startTime = pendingCaptureTime.current;
              if (startTime !== undefined) {
                pendingCaptureTime.current = undefined;
                connectionCtx.setImagingSession((previous) => ({
                  ...previous,
                  startTime,
                }));
                saveImagingSessionDb("startTime", String(startTime));
              }
            } else if (state === 2) setCaptureStatus("Capture is stopping.");
            else if (state === 3 || state === 0) {
              setWarning(undefined);
              setCaptureStatus("Capture stopped.");
            }
          }
        },
        (ready) => {
          if (!mounted || ready) return;
          reset();
          setFocusStatus("Focus state unavailable while disconnected.");
          setCaptureStatus("Capture state unavailable while disconnected.");
        },
      );
    }
    return () => {
      mounted = false;
      sessionRevision.current += 1;
      socket?.stopCallbacks?.(sender);
      if (continuousFocusHeld.current) {
        continuousFocusHeld.current = false;
        void socket?.request?.("stopFocus").catch(() => undefined);
      }
    };
  }, [
    connectionCtx.IPDwarf,
    connectionCtx.socketIPDwarf,
    connectionCtx.setImagingSession,
    connectionCtx.setValueFocusDwarf,
  ]);

  useEffect(() => {
    setValidSettings(isValid());
  }, [
    connectionCtx.astroSettings,
    connectionCtx.currentAstroCamera,
    connectionCtx.typeIdDwarf,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const sizeSmallScreen = 768;

  useEffect(() => {
    let testTimer: string | any = "";
    if (connectionCtx.timerGlobal)
      testTimer = connectionCtx.timerGlobal.toString();
    console.debug(" TG --- Global Timer:", testTimer, connectionCtx);
    if (connectionCtx.imagingSession.isRecording)
      console.debug("TG isRecording True:", testTimer, connectionCtx);
    else console.debug("TG isRecording False:", testTimer, connectionCtx);
    if (connectionCtx.imagingSession.endRecording)
      console.debug("TG endRecording True:", testTimer, connectionCtx);
    else console.debug("TG endRecording False:", testTimer, connectionCtx);
  }, [connectionCtx.timerGlobal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let testTimer: string | any = "";
    if (connectionCtx.timerGlobal)
      testTimer = connectionCtx.timerGlobal.toString();
    if (connectionCtx.imagingSession.isRecording) {
      console.debug("setIsRecording True:", testTimer, connectionCtx);
      if (!timerSessionInit) {
        timerSession = startTimer();
        if (timerSession) {
          timerSessionInit = true;
          testTimer = timerSession.toString();
          console.debug("startTimer timer:", testTimer, connectionCtx);
          connectionCtx.setTimerGlobal(timerSession);
        } else timerSessionInit = false;
      }
    } else console.debug("setIsRecording False:", testTimer, connectionCtx);
  }, [connectionCtx.imagingSession.isRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let testTimer: string | any = "";
    if (connectionCtx.timerGlobal)
      testTimer = connectionCtx.timerGlobal.toString();
    if (connectionCtx.imagingSession.endRecording)
      console.debug("endRecording True:", testTimer, connectionCtx);
    else console.debug("endRecording false:", testTimer, connectionCtx);
  }, [connectionCtx.imagingSession.endRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let testTimer: string | any = "";
    if (connectionCtx.timerGlobal)
      testTimer = connectionCtx.timerGlobal.toString();
    if (connectionCtx.imagingSession.isStackedCountStart)
      console.debug("isStackedCountStart True:", testTimer, connectionCtx);
    else console.debug("isStackedCountStart false:", testTimer, connectionCtx);
  }, [connectionCtx.imagingSession.isStackedCountStart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let testTimer: string | any = "";
    if (connectionCtx.timerGlobal)
      testTimer = connectionCtx.timerGlobal.toString();
    else if (timerSession) testTimer = timerSession.toString();
    if (connectionCtx.imagingSession.isGoLive) {
      console.debug("isGoLive True:", testTimer, connectionCtx);
      stopTimer();
    } else console.debug("isGoLive false:", testTimer, connectionCtx);
    return () => {
      if (connectionCtx.imagingSession.isGoLive) {
        stopTimer();
      }
    };
  }, [connectionCtx.imagingSession.isGoLive]); // eslint-disable-line react-hooks/exhaustive-deps

  function isValid() {
    const isWideCamera = connectionCtx.currentAstroCamera == wideangleCamera;
    let errors = validateAstroSettings(connectionCtx.astroSettings as any, {
      camera: isWideCamera ? "wide" : "telephoto",
      requireLegacyFields: false,
    });
    return (
      Object.keys(errors).length === 0 &&
      Object.keys(connectionCtx.astroSettings).length > 0
    );
  }

  function timerFunction() {
    if (!connectionCtx.imagingSession.isGoLive) {
      let time = calculateSessionTime(connectionCtx);
      if (time) {
        connectionCtx.setImagingSession((prev) => {
          prev["sessionElaspsedTime"] = time as string;
          return { ...prev };
        });
        saveImagingSessionDb("sessionElaspsedTime", time.toString());
      }
    } else {
      stopTimer();
    }
  }

  function startTimer() {
    let timer: string | any = "";
    if (!connectionCtx.timerGlobal) {
      timer = setInterval(timerFunction, 500);
    } else timer = connectionCtx.timerGlobal;

    return timer;
  }

  async function takeAstroPhotoHandler() {
    if (capturePending.current || !isValid()) return;
    const socket = connectionCtx.socketIPDwarf;
    if (!connectionCtx.connectionStatus || !socket?.request) {
      setCaptureStatus(
        "Connect the telescope and wait for device status first.",
      );
      return;
    }
    capturePending.current = true;
    setCaptureBusy(true);
    setCaptureStatus("Requesting capture…");
    const revision = sessionRevision.current;
    const previousNotification = captureNotificationRevision.current;
    pendingCaptureTime.current = Date.now();
    try {
      await startCurrentAstroCapture(connectionCtx);
      if (
        sessionRevision.current === revision &&
        captureNotificationRevision.current === previousNotification
      ) {
        setCaptureStatus(
          "Capture request accepted. Waiting for telescope progress.",
        );
      }
      // Recording, counters and completion are owned by device notifications.
      // A start ACK cannot manufacture a recording session or successful image.
    } catch (error) {
      if (sessionRevision.current === revision) {
        pendingCaptureTime.current = undefined;
        setCaptureStatus(
          error instanceof Error ? error.message : "Capture request failed.",
        );
      }
    } finally {
      if (sessionRevision.current === revision) {
        capturePending.current = false;
        setCaptureBusy(false);
      }
    }
  }

  async function stopAstroPhotoHandler() {
    if (stopCapturePending.current) return;
    const socket = connectionCtx.socketIPDwarf;
    if (!connectionCtx.connectionStatus || !socket?.request) {
      setCaptureStatus(
        "Reconnect to request a capture stop; telescope state is unknown.",
      );
      return;
    }
    stopCapturePending.current = true;
    const revision = sessionRevision.current;
    const previousNotification = captureNotificationRevision.current;
    setCaptureStatus("Requesting capture stop…");
    try {
      await socket.request(
        connectionCtx.currentAstroCamera === wideangleCamera
          ? "stopWideCapture"
          : "stopTeleCapture",
      );
      if (
        sessionRevision.current === revision &&
        captureNotificationRevision.current === previousNotification
      ) {
        setCaptureStatus(
          "Stop request accepted. Waiting for the telescope to stop.",
        );
      }
    } catch (error) {
      if (sessionRevision.current === revision) {
        setCaptureStatus(
          error instanceof Error
            ? error.message
            : "Capture stop request failed.",
        );
      }
    } finally {
      if (sessionRevision.current === revision)
        stopCapturePending.current = false;
    }
    // Never mark idle/end the session on a rejected stop or on its ACK alone.
  }

  async function goLiveHandler() {
    const socket = connectionCtx.socketIPDwarf;
    if (!connectionCtx.connectionStatus || !socket?.request) {
      setCaptureStatus("Connect the telescope to return to preview.");
      return;
    }
    try {
      await socket.request(
        connectionCtx.currentAstroCamera === wideangleCamera
          ? "goLiveWide"
          : "goLiveTele",
      );
      endPreview();
      setCaptureStatus("Live preview requested.");
    } catch (error) {
      setCaptureStatus(
        error instanceof Error ? error.message : "Could not return to preview.",
      );
    }
  }

  function stopTimer() {
    let testTimer: string | any = "";
    if (timerSession) {
      testTimer = timerSession.toString();
      console.debug(
        "ImagingSession tS clearInterval:",
        testTimer,
        connectionCtx,
      );
    }

    // use connectionContext
    if (connectionCtx.timerGlobal) {
      testTimer = connectionCtx.timerGlobal.toString();
      console.debug(
        "ImagingSession tG clearInterval:",
        testTimer,
        connectionCtx,
      );
    }
    if (connectionCtx.timerGlobal) clearInterval(connectionCtx.timerGlobal);
    connectionCtx.setTimerGlobal(undefined);

    if (timerSession) clearInterval(timerSession);

    timerSessionInit = false;
  }

  function endPreview() {
    saveImagingSessionDb("endRecording", false.toString());
    if (connectionCtx.imagingSession.endRecording) {
      connectionCtx.setImagingSession((prev) => {
        prev["endRecording"] = false;
        return { ...prev };
      });
    }
    saveImagingSessionDb("isGoLive", false.toString());
    if (connectionCtx.imagingSession.isGoLive) {
      connectionCtx.setImagingSession((prev) => {
        prev["isGoLive"] = false;
        return { ...prev };
      });
    }
    connectionCtx.setImagingSession({} as ImagingSession);
    removeImagingSessionDb();
    setUseRawPreviewURL(false);

    setTimeout(() => {
      if (connectionCtx.currentAstroCamera != wideangleCamera)
        turnOnTeleCameraFn(connectionCtx);
      else turnOnWideCameraFn(connectionCtx);
    }, 1000);
    let gain = "gain";
    let gainValue = connectionCtx.astroSettings.gain;
    let exposureMode = "exposureMode";
    let exposureModeValue = connectionCtx.astroSettings.exposureMode;
    let exposure = "exposure";
    let exposureValue = connectionCtx.astroSettings.exposure;

    if (connectionCtx.currentAstroCamera != wideangleCamera) {
      setTimeout(() => {
        updateTelescopeISPSetting(
          "gainMode",
          connectionCtx.astroSettings.gainMode as number,
          connectionCtx,
        );
      }, 1000);
      setTimeout(() => {
        updateTelescopeISPSetting(
          "IR",
          connectionCtx.astroSettings.IR as number,
          connectionCtx,
        );
      }, 3500);
    } else {
      gain = "wideGain";
      gainValue = connectionCtx.astroSettings.wideGain;
      exposureMode = "wideExposureMode";
      exposureModeValue = connectionCtx.astroSettings.wideExposureMode;
      exposure = "wideExposure";
      exposureValue = connectionCtx.astroSettings.wideExposure;
    }

    setTimeout(() => {
      updateTelescopeISPSetting(
        exposureMode,
        exposureModeValue as number,
        connectionCtx,
      );
    }, 2000);
    setTimeout(() => {
      updateTelescopeISPSetting(gain, gainValue as number, connectionCtx);
    }, 2500);
    setTimeout(() => {
      updateTelescopeISPSetting(
        exposure,
        exposureValue as number,
        connectionCtx,
      );
    }, 3000);
  }

  function focusMinus() {
    void focusAction(false, false, false, 1);
  }
  function focusPlus() {
    void focusAction(false, false, false, 0);
  }
  function focusMinusLong() {
    continuousFocusHeld.current = true;
    void focusAction(false, true, false, 1);
  }
  function focusPlusLong() {
    continuousFocusHeld.current = true;
    void focusAction(false, true, false, 0);
  }
  function focusLongStop() {
    if (!continuousFocusHeld.current) return;
    continuousFocusHeld.current = false;
    void focusAction(false, true, true, 0);
  }
  function focusAutoAstro() {
    void focusAction(true, false, false, 0);
  }
  function focusAutoAstroStop() {
    void focusAction(true, false, true, 0);
  }
  const handleRightClick = (event: MouseEvent) => {
    event.preventDefault();
    focusAutoAstro();
  };

  async function focusAction(
    astro: boolean,
    continuous: boolean,
    stop: boolean,
    direction: 0 | 1,
  ) {
    const socket = connectionCtx.socketIPDwarf;
    if (!connectionCtx.connectionStatus || !socket?.request) {
      setFocusStatus("Connect the telescope to use focus controls.");
      continuousFocusHeld.current = false;
      return;
    }
    const operation = astro
      ? stop
        ? "stopAstroAutoFocus"
        : "astroAutoFocus"
      : continuous
        ? stop
          ? "stopFocus"
          : "focusContinuous"
        : "focusStep";
    if (pendingFocusCommands.current.has(operation)) return;
    pendingFocusCommands.current.add(operation);
    const revision = sessionRevision.current;
    const previousNotification = focusNotificationRevision.current;
    if (astro && !stop) {
      setFocusRequested(true);
      focusStopRequested.current = false;
    }
    if (astro && stop) focusStopRequested.current = true;
    setFocusStatus(
      stop ? "Requesting focus stop…" : "Requesting focus adjustment…",
    );
    try {
      const values =
        astro && !stop ? { mode: 1 } : !astro && !stop ? { direction } : {};
      await socket.request(operation, values);
      if (
        sessionRevision.current !== revision ||
        focusNotificationRevision.current !== previousNotification
      )
        return;
      setFocusStatus(
        stop
          ? "Focus stop accepted. Waiting for the telescope."
          : astro
            ? "Autofocus request accepted. Waiting for telescope focus state."
            : continuous
              ? "Continuous focus request accepted. Release to request stop."
              : "Focus step accepted. Waiting for telescope position.",
      );
      // 15011 reads saved infinity position; it is NOT motor initialization.
    } catch (error) {
      if (sessionRevision.current === revision) {
        if (astro && !stop) setFocusRequested(false);
        setFocusStatus(
          error instanceof Error ? error.message : "The focus request failed.",
        );
      }
    } finally {
      if (sessionRevision.current === revision)
        pendingFocusCommands.current.delete(operation);
    }
  }

  function captureControlHandler() {
    if (showSettingsMenu) return;
    if (!validSettings) {
      setShowSettingsMenu(true);
      return;
    }
    if (
      connectionCtx.imagingSession.isRecording &&
      !connectionCtx.imagingSession.endRecording
    ) {
      void stopAstroPhotoHandler();
    } else if (
      connectionCtx.imagingSession.isGoLive ||
      connectionCtx.imagingSession.endRecording
    ) {
      void goLiveHandler();
    } else {
      void takeAstroPhotoHandler();
    }
  }

  function renderRecordButton() {
    if (
      connectionCtx.imagingSession.isRecording &&
      !connectionCtx.imagingSession.endRecording
    ) {
      return <RecordingButton color_stroke="red" title="Stop Recording" />;
    }
    return (
      <RecordButton
        title={captureBusy ? "Capture request pending" : "Start Recording"}
      />
    );
  }

  /*
  let startTime;
  let isLongPress = false;

  function handleMouseDown() {
    startTime = new Date().getTime();

    // Set a timeout for the long press
    setTimeout(() => {
      isLongPress = true;
      console.log("Long press detected");
    }, 500); // Adjust the duration as needed
  }

  function handleMouseUp() {
    const endTime = new Date().getTime();
    const duration = endTime - startTime;

    // Check if it was a short click
    if (duration < 500 && !isLongPress) {
      console.log("Short click detected");
      // Perform your action for a short click
    }

    // Reset variables for the next interaction
    startTime = 0;
    isLongPress = false;
  }
  */
  function anim_close() {
    const joystickContainer = document.querySelector(
      ".joystick-container",
    ) as HTMLElement;
    // Check if the element is found
    if (joystickContainer) {
      const animationDuration = 500; // 0.5 seconds
      const start = performance.now();

      const animateHide = (timestamp) => {
        const elapsed = timestamp - start;
        const opacity = 1 - elapsed / animationDuration;

        joystickContainer.style.opacity = opacity.toString();

        if (opacity > 0) {
          requestAnimationFrame(animateHide);
        } else {
          joystickContainer.style.display = "none";
        }
      };
      requestAnimationFrame(animateHide);
    }
  }

  function checkPhotoMode() {
    if (
      connectionCtx.imagingSession.isRecording ||
      connectionCtx.imagingSession.endRecording ||
      connectionCtx.imagingSession.isGoLive
    ) {
      if (showModal) setShowModal(false);
      return (
        <span className={styles.statusLabel} aria-live="polite">
          {getAstroText()}
        </span>
      );
    }
    return "";
  }

  function getAstroText() {
    let strAstroText = "Astro";
    if (connectionCtx.typeIdDwarf != 1) {
      if (connectionCtx.currentAstroCamera != wideangleCamera)
        strAstroText += " TELE";
      else strAstroText += " WIDE";
    }
    return strAstroText;
  }

  const toolbar = (
    <ul
      className="nav nav-pills dw-imaging-toolbar"
      aria-label="Imaging controls"
    >
      {screenWidth >= sizeSmallScreen && (
        <li className={`nav-item ${styles.box}`}>
          {checkPhotoMode()}
          {!showModal &&
            !connectionCtx.imagingSession.isRecording &&
            !connectionCtx.imagingSession.endRecording && (
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  setShowModal(true);
                }}
                aria-label={`Open ${getAstroText()} camera controls`}
              >
                {getAstroText()}
              </button>
            )}
          {showModal &&
            !connectionCtx.imagingSession.isRecording &&
            !connectionCtx.imagingSession.endRecording && (
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  setShowModal(false);
                  anim_close();
                }}
                aria-label="Close camera controls"
              >
                Close
              </button>
            )}
        </li>
      )}
      <li className={`nav-item ${styles.box}`}>
        <button
          type="button"
          className={styles.toolbarButton}
          title="Astrophotography settings"
          aria-label="Open astrophotography settings"
          onClick={() => setShowSettingsMenu(true)}
        >
          <i className="bi bi-sliders" style={{ fontSize: "1.75rem" }}></i>
        </button>
      </li>
      <li className={`nav-item ${styles.box}`}>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={captureControlHandler}
          disabled={captureBusy && !connectionCtx.imagingSession.isRecording}
          aria-label={
            validSettings
              ? connectionCtx.imagingSession.isRecording
                ? "Stop astrophotography capture"
                : "Start astrophotography capture"
              : "Configure required astrophotography settings"
          }
        >
          {renderRecordButton()}
        </button>
      </li>
      <li className={`nav-item ${styles.box}`}>
        {!showWideAngle && (
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={() => {
              setShowWideangle((prev) => !prev);
              setShowWideAngle((prev) => !prev);
            }}
            title="Show Wideangle"
            aria-label="Show wide-angle overlay"
          >
            <i
              className="bi bi-pip"
              style={{
                fontSize: "1.75rem",
                transform: "rotate(180deg)",
                display: "inline-block",
              }}
            ></i>
          </button>
        )}
        {showWideAngle && !exchangeCamerasStatus && (
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={() => {
              setShowWideangle((prev) => !prev);
              setShowWideAngle((prev) => !prev);
            }}
            title="Hide Wideangle"
            aria-label="Hide wide-angle overlay"
          >
            <i
              className="bi bi-pip"
              style={{
                fontSize: "1.75rem",
                transform: "rotate(180deg)",
                display: "inline-block",
              }}
            ></i>
          </button>
        )}
      </li>
      {!connectionCtx.imagingSession.isRecording &&
        connectionCtx.imagingSession.isGoLive && (
          <li className={`nav-item ${styles.box}`}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() => {
                goLiveHandler();
              }}
              title="End Current Session"
            >
              Live
            </button>
          </li>
        )}
      <hr />
      {!connectionCtx.imagingSession.isRecording &&
        !connectionCtx.imagingSession.endRecording &&
        !astroFocus &&
        !focusRequested && (
          <div onContextMenu={handleRightClick}>
            <li className={`nav-item ${styles.box}`}>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={focusAutoAstro}
                title="Start astrophotography autofocus"
                aria-label="Start astrophotography autofocus"
              >
                <i
                  className="icon-bullseye"
                  style={{
                    fontSize: "2rem",
                  }}
                ></i>
              </button>
            </li>
            {connectionCtx.valueFocusDwarf !== undefined && (
              <span style={{ display: "block", textAlign: "center" }}>
                {connectionCtx.valueFocusDwarf}
              </span>
            )}
          </div>
        )}
      {!connectionCtx.imagingSession.isRecording &&
        !connectionCtx.imagingSession.endRecording &&
        (astroFocus || focusRequested) && (
          <div>
            <li className={`nav-item ${styles.box}`}>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={focusAutoAstroStop}
                title="Stop astrophotography autofocus"
                aria-label="Stop astrophotography autofocus"
              >
                <i
                  className="icon-bullseye"
                  style={{
                    fontSize: "2rem",
                  }}
                ></i>
              </button>
            </li>
            {connectionCtx.valueFocusDwarf !== undefined && (
              <span style={{ display: "block", textAlign: "center" }}>
                {connectionCtx.valueFocusDwarf}
              </span>
            )}
          </div>
        )}
      <hr />
      {!connectionCtx.imagingSession.isRecording &&
        !connectionCtx.imagingSession.endRecording && (
          <li className={`nav-item ${styles.box}`}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={focusPlus}
              title="Move focus one step forward"
              aria-label="Focus one step forward"
            >
              <i
                className="icon-plus-squared-alt"
                style={{
                  fontSize: "2rem",
                }}
              ></i>
            </button>
          </li>
        )}
      <hr />
      {!connectionCtx.imagingSession.isRecording &&
        !connectionCtx.imagingSession.endRecording && (
          <li className={`nav-item ${styles.box}`}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={focusMinus}
              title="Move focus one step backward"
              aria-label="Focus one step backward"
            >
              <i
                className="icon-minus-squared-alt"
                style={{
                  fontSize: "2rem",
                }}
              ></i>
            </button>
          </li>
        )}
      <hr />
      {!connectionCtx.imagingSession.isRecording &&
        !connectionCtx.imagingSession.endRecording && (
          <li className={`nav-item ${styles.box}`}>
            <button
              type="button"
              className={styles.toolbarButton}
              onPointerDown={focusPlusLong}
              onPointerUp={focusLongStop}
              onPointerLeave={focusLongStop}
              onPointerCancel={focusLongStop}
              title="Hold to move focus forward"
              aria-label="Hold to focus forward"
            >
              <i
                className="icon-plus-squared"
                style={{
                  fontSize: "2rem",
                }}
              ></i>
            </button>
          </li>
        )}
      <hr />
      {!connectionCtx.imagingSession.isRecording &&
        !connectionCtx.imagingSession.endRecording && (
          <li className={`nav-item ${styles.box}`}>
            <button
              type="button"
              className={styles.toolbarButton}
              onPointerDown={focusMinusLong}
              onPointerUp={focusLongStop}
              onPointerLeave={focusLongStop}
              onPointerCancel={focusLongStop}
              title="Hold to move focus backward"
              aria-label="Hold to focus backward"
            >
              <i
                className="icon-minus-squared"
                style={{
                  fontSize: "2rem",
                }}
              ></i>
            </button>
          </li>
        )}
      {screenWidth < sizeSmallScreen && (
        <>
          <hr />
          <li className={`nav-item ${styles.box}`}>
            {checkPhotoMode()}
            {!showModal &&
              !connectionCtx.imagingSession.isRecording &&
              !connectionCtx.imagingSession.endRecording && (
                <button
                  type="button"
                  className={styles.toolbarButton}
                  aria-label={`Open ${getAstroText()} capture controls`}
                  onClick={() => setShowModal(true)}
                >
                  {getAstroText()}
                </button>
              )}
            {showModal &&
              !connectionCtx.imagingSession.isRecording &&
              !connectionCtx.imagingSession.endRecording && (
                <button
                  type="button"
                  className={styles.toolbarButton}
                  aria-label="Close capture controls"
                  onClick={() => {
                    setShowModal(false);
                    anim_close();
                  }}
                >
                  Close
                </button>
              )}
          </li>
        </>
      )}
      {focusStatus && (
        <li className={styles.focusFeedback} aria-live="polite">
          {focusStatus}
        </li>
      )}
      {captureStatus && (
        <li className={styles.focusFeedback} aria-live="polite">
          {captureStatus}
        </li>
      )}
      {warning && (
        <div role="alert">
          <p>{warning}</p>
          <button
            type="button"
            disabled={captureBusy || !connectionCtx.connectionStatus}
            onClick={async () => {
              setCaptureBusy(true);
              try {
                if (!connectionCtx.socketIPDwarf)
                  throw new Error("Reconnect before continuing capture.");
                await connectionCtx.socketIPDwarf.request("continueCapture");
                setWarning(undefined);
                setCaptureStatus(
                  "Continue requested; awaiting device progress.",
                );
              } catch (error) {
                setCaptureStatus(
                  error instanceof Error ? error.message : String(error),
                );
              } finally {
                setCaptureBusy(false);
              }
            }}
          >
            Continue despite dark-frame warning
          </button>
        </div>
      )}
      <CameraAddOn showModal={showModal} setShowModal={setShowModal} />
    </ul>
  );

  return (
    <>
      {toolbar}
      <Modal
        show={showSettingsMenu}
        onHide={() => setShowSettingsMenu(false)}
        className={styles.settingsModalRoot}
        centered
        scrollable
        fullscreen="sm-down"
        dialogClassName={styles.settingsDialog}
        aria-labelledby="astro-settings-title"
      >
        <Modal.Header closeButton className={styles.settingsModalHeader}>
          <Modal.Title id="astro-settings-title">
            Astrophotography settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className={styles.settingsModalBody}>
          <ImagingAstroSettings
            setValidSettings={setValidSettings}
            validSettings={validSettings}
            setShowSettingsMenu={setShowSettingsMenu}
          />
        </Modal.Body>
      </Modal>
    </>
  );
}
