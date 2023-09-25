import { useContext, useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Tooltip from "react-bootstrap/Tooltip";
import Link from "next/link";

import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  wsURL,
  takeAstroPhoto,
  takeAstroPhotoCmd,
  socketSend,
  stopAstroPhoto,
  stopAstroPhotoCmd,
  numberRawImagesCmd,
  numberSuperImposedImages,
  telephotoCamera,
  astroAutofocus,
  astroAutofocusCmd,
  startMotion,
  startMotionCmd,
  stopMotion,
  stopMotionCmd,
  rawPreviewURL,
  setRAWPreviewCmd,
  updateRawPreviewSource,
  DwarfIP,
} from "dwarfii_api";
import ImagingAstroSettings from "@/components/imaging/ImagingAstroSettings";
import RecordingButton from "@/components/icons/RecordingButton";
import RecordButton from "@/components/icons/RecordButton";
import { logger } from "@/lib/logger";
import { validateAstroSettings } from "@/components/imaging/form_validations";
import { ImagingSession } from "@/types";
import { saveImagingSessionDb, removeImagingSessionDb } from "@/db/db_utils";
import {
  turnOnCameraFn,
  calculateSessionTime,
  updateTelescopeISPSetting,
} from "@/lib/dwarf_utils";
import styles from "@/components/imaging/ImagingMenu.module.css";

type PropType = {
  setShowWideangle: Dispatch<SetStateAction<boolean>>;
  setUseRawPreviewURL: Dispatch<SetStateAction<boolean>>;
};

export default function ImagingMenu(props: PropType) {
  const { setShowWideangle, setUseRawPreviewURL } = props;
  let connectionCtx = useContext(ConnectionContext);
  const [showWideAngle, setShowWideAngle] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [validSettings, setValidSettings] = useState(isValid());
  const [isRecording, setIsRecording] = useState(false);
  const [endRecording, setEndRecording] = useState(false);
  const [isStackedCountStart, setIsStackedCountStart] = useState(false);
  const [timerGlobal, setTimerGlobal] =
    useState<ReturnType<typeof setInterval>>();

  let timerSession: ReturnType<typeof setInterval>;
  let timerSessionInit: boolean = false;

  useEffect(() => {
    let testTimer: string | any = "";
    if (timerGlobal) testTimer = timerGlobal.toString();
    logger(" TG --- Global Timer:", testTimer, connectionCtx);
    if (isRecording)
      logger("TG setIsRecording True:", testTimer, connectionCtx);
    else logger("TG setIsRecording False:", testTimer, connectionCtx);
    if (endRecording) logger("TG endRecording True:", testTimer, connectionCtx);
    else logger("TG endRecording False:", testTimer, connectionCtx);
  }, [timerGlobal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let testTimer: string | any = "";
    if (timerGlobal) testTimer = timerGlobal.toString();
    if (isRecording) logger("setIsRecording True:", testTimer, connectionCtx);
    else logger("setIsRecording False:", testTimer, connectionCtx);
  }, [isRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let testTimer: string | any = "";
    if (timerGlobal) testTimer = timerGlobal.toString();
    if (endRecording) logger("endRecording True:", testTimer, connectionCtx);
    else logger("endRecording false:", testTimer, connectionCtx);
  }, [endRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let testTimer: string | any = "";
    if (timerGlobal) testTimer = timerGlobal.toString();
    if (endRecording) logger("endRecording True:", testTimer, connectionCtx);
    else logger("endRecording false:", testTimer, connectionCtx);
  }, [endRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let testTimer: string | any = "";
    if (timerGlobal) testTimer = timerGlobal.toString();
    if (isStackedCountStart)
      logger("isStackedCountStart True:", testTimer, connectionCtx);
    else logger("isStackedCountStart false:", testTimer, connectionCtx);
  }, [isStackedCountStart]); // eslint-disable-line react-hooks/exhaustive-deps

  function isValid() {
    let errors = validateAstroSettings(connectionCtx.astroSettings as any);
    return (
      Object.keys(errors).length === 0 &&
      Object.keys(connectionCtx.astroSettings).length > 0
    );
  }

  function startTimer() {
    let timer = undefined;
    if (!timerSessionInit) {
      timer = setInterval(() => {
        let time = calculateSessionTime(connectionCtx);
        if (time) {
          connectionCtx.setImagingSession((prev) => {
            prev["sessionElaspsedTime"] = time as string;
            return { ...prev };
          });
        }
      }, 2000);
    } else timer = timerSession;

    return timer;
  }

  function takeAstroPhotoHandler() {
    if (connectionCtx.IPDwarf == undefined) {
      return;
    }
    if (validSettings === false) {
      return;
    }

    let testTimer: string | any = "";
    if (!timerSessionInit) {
      timerSession = startTimer();
      if (timerSession) {
        timerSessionInit = true;
        testTimer = timerSession.toString();
        logger("startTimer timer:", testTimer, connectionCtx);
        setTimerGlobal(timerSession);
      } else timerSessionInit = false;
    }

    if (timerSessionInit && timerSession) {
      testTimer = timerSession.toString();
      logger("startImagingSession timer:", testTimer, connectionCtx);

      let now = Date.now();
      connectionCtx.setImagingSession((prev) => {
        prev.startTime = now;
        return { ...prev };
      });
      setIsRecording(true);
      setIsStackedCountStart(false);

      saveImagingSessionDb("startTime", now.toString());
      setEndRecording(false);

      //startAstroPhotoHandler

      logger("startAstroPhotoHandler current ST:", testTimer, connectionCtx);
      connectionCtx.setImagingSession((prev) => {
        prev["imagesTaken"] = 0;
        return { ...prev };
      });
      connectionCtx.setImagingSession((prev) => {
        prev["imagesStacked"] = 0;
        return { ...prev };
      });
      //socket connects to Dwarf
      if (connectionCtx.socketIPDwarf) {
        if (connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN)
          connectionCtx.socketIPDwarf.close();
      }
      let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
      connectionCtx.setSocketIPDwarf(socket);

      socket.addEventListener("open", () => {
        let payload = takeAstroPhoto(
          connectionCtx.astroSettings.rightAcension as string,
          connectionCtx.astroSettings.declination as string,
          connectionCtx.astroSettings.exposure as number,
          connectionCtx.astroSettings.gain as number,
          connectionCtx.astroSettings.binning as number,
          connectionCtx.astroSettings.count as number,
          connectionCtx.astroSettings.fileFormat as number
        );
        logger("start takeAstroPhoto...", payload, connectionCtx);

        socketSend(socket, payload);
      });

      socket.addEventListener("message", (event) => {
        let message = JSON.parse(event.data);
        if (message.interface === takeAstroPhotoCmd) {
          logger("takeAstroPhoto:", message, connectionCtx);

          // update image count
        } else if (message.interface === numberRawImagesCmd) {
          // BUG: dwarf does not return message for every image taken if Mobile App is On
          logger("takeAstroPhoto count:", message, connectionCtx);
          connectionCtx.setImagingSession((prev) => {
            prev["imagesTaken"] = message.currentCount;
            return { ...prev };
          });
          saveImagingSessionDb("imagesTaken", message.currentCount.toString());
          logger(
            "takeAstroPhoto currentCount:",
            message.currentCount.toString(),
            connectionCtx
          );
          if (timerSession) testTimer = timerSession.toString();
          logger("takeAstroPhoto currentCount ST:", testTimer, connectionCtx);

          // update UI once imaging session is done imaging
          if (message.currentCount === connectionCtx.astroSettings.count) {
            logger("takeAstroPhoto endImagingSession:", message, connectionCtx);
            logger(
              "ImagingSession befor clearInterval:",
              testTimer,
              connectionCtx
            );
            //Call endImagingSession
            endImagingSession();
          }
        } else if (message.interface == numberSuperImposedImages) {
          logger("takeAstroPhoto Stacked count:", message, connectionCtx);
          connectionCtx.setImagingSession((prev) => {
            prev["imagesStacked"] = message.stackedCount;
            return { ...prev };
          });
          saveImagingSessionDb(
            "imagesStacked",
            message.stackedCount.toString()
          );
          logger(
            "takeAstroPhoto stackedCount:",
            message.stackedCount.toString(),
            connectionCtx
          );

          // update Camera to rawPreviewURL once first stacked image is done
          if (message.stackedCount > 0 && !isStackedCountStart) {
            setIsStackedCountStart(true);
            logger(
              "takeAstroPhoto Camera to rawPreviewURL:",
              message,
              connectionCtx
            );
            let payload = updateRawPreviewSource();
            logger("start swithRawPreview...", payload, connectionCtx);
            socketSend(socket, payload);
            setUseRawPreviewURL(true);
          }
        } else if (message.interface === setRAWPreviewCmd) {
          logger(
            "setRAWPreviewCmd Camera to rawPreviewURL:",
            message,
            connectionCtx
          );
          let IPDwarf = connectionCtx.IPDwarf || DwarfIP;
          let testPreviewURL = rawPreviewURL(IPDwarf);
          if (testPreviewURL)
            console.log("start UseRawPreviewURL : " + testPreviewURL);
        } else {
          logger("", message, connectionCtx);
        }
      });

      socket.addEventListener("error", (err) => {
        logger("takeAstroPhoto error:", err, connectionCtx);
      });

      socket.addEventListener("close", (err) => {
        logger("takeAstroPhoto close:", err, connectionCtx);
        if (isRecording) endImagingSession();
      });
    }
  }

  function stopAstroPhotoHandler() {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }

    //socket connects to Dwarf
    if (connectionCtx.socketIPDwarf) {
      if (connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN)
        connectionCtx.socketIPDwarf.close();
    }
    let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
    connectionCtx.setSocketIPDwarf(socket);

    socket.addEventListener("open", () => {
      let payload = stopAstroPhoto();
      logger("begin stopAstroPhoto...", payload, connectionCtx);
      socketSend(socket, payload);
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (message.interface === stopAstroPhotoCmd) {
        logger("stopAstroPhoto", message, connectionCtx);
        endImagingSession();

        // update image count
      } else if (message.interface === numberRawImagesCmd) {
        // BUG: dwarf does not return message for every image taken if Mobile App is On
        logger("takeAstroPhoto count:", message, connectionCtx);
        connectionCtx.setImagingSession((prev) => {
          prev["imagesTaken"] = message.currentCount;
          return { ...prev };
        });
        saveImagingSessionDb("imagesTaken", message.currentCount.toString());
        logger(
          "takeAstroPhoto currentCount:",
          message.currentCount.toString(),
          connectionCtx
        );
      } else if (message.interface === numberSuperImposedImages) {
        logger("takeAstroPhoto Stacked count:", message, connectionCtx);
        connectionCtx.setImagingSession((prev) => {
          prev["imagesStacked"] = message.stackedCount;
          return { ...prev };
        });
        saveImagingSessionDb("imagesStacked", message.stackedCount.toString());
        logger(
          "takeAstroPhoto stackedCount:",
          message.currentCount.toString(),
          connectionCtx
        );
      } else {
        logger("", message, connectionCtx);
      }
    });

    socket.addEventListener("error", (error) => {
      logger("stopAstroPhoto error:", error, connectionCtx);
    });

    socket.addEventListener("close", (error) => {
      logger("stopAstroPhoto close:", error, connectionCtx);
    });
  }

  function endImagingSession() {
    let testTimer: string | any = "";
    if (timerSession) {
      testTimer = timerSession.toString();
      logger("ImagingSession tS clearInterval:", testTimer, connectionCtx);
    }
    if (timerGlobal) {
      testTimer = timerGlobal.toString();
      logger("ImagingSession tG clearInterval:", testTimer, connectionCtx);
    }
    // timerSession if Photos Session is completed !
    if (timerSession) clearInterval(timerSession);
    if (timerGlobal) clearInterval(timerGlobal);
    timerSessionInit = false;
    setEndRecording(true);
    setIsRecording(false);
  }

  function endPreview() {
    connectionCtx.setImagingSession({} as ImagingSession);
    removeImagingSessionDb();

    setEndRecording(false);
    setUseRawPreviewURL(false);

    setTimeout(() => {
      turnOnCameraFn(telephotoCamera, connectionCtx);
    }, 1000);
    setTimeout(() => {
      updateTelescopeISPSetting(
        "gainMode",
        connectionCtx.astroSettings.gainMode as number,
        connectionCtx
      );
    }, 1500);
    setTimeout(() => {
      updateTelescopeISPSetting(
        "exposureMode",
        connectionCtx.astroSettings.exposureMode as number,
        connectionCtx
      );
    }, 2000);
    setTimeout(() => {
      updateTelescopeISPSetting(
        "gain",
        connectionCtx.astroSettings.gain as number,
        connectionCtx
      );
    }, 2500);
    setTimeout(() => {
      updateTelescopeISPSetting(
        "exposure",
        connectionCtx.astroSettings.exposure as number,
        connectionCtx
      );
    }, 3000);
    setTimeout(() => {
      updateTelescopeISPSetting(
        "IR",
        connectionCtx.astroSettings.IR as number,
        connectionCtx
      );
    }, 3500);
  }

  function focusAction(
    motor: number,
    mode: number,
    mStep: number,
    speed: number,
    direction: number,
    pulse: number,
    accelStep: number
  ) {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }

    //socket connects to Dwarf
    if (connectionCtx.socketIPDwarf) {
      if (connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN)
        connectionCtx.socketIPDwarf.close();
    }
    let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
    connectionCtx.setSocketIPDwarf(socket);

    socket.addEventListener("open", () => {
      let payload = startMotion(
        motor,
        mode,
        mStep,
        speed,
        direction,
        pulse,
        accelStep
      );
      logger("begin focusAction...", payload, connectionCtx);
      socketSend(socket, payload);
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (message.interface === startMotionCmd) {
        logger("focusAction", message, connectionCtx);
      } else {
        logger("", message, connectionCtx);
      }
    });

    socket.addEventListener("error", (error) => {
      logger("focusAction error:", error, connectionCtx);
    });

    socket.addEventListener("close", (error) => {
      logger("focusAction close:", error, connectionCtx);
    });
  }

  function focusActionStop(motor: number, decelStep: number) {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }

    //socket connects to Dwarf
    if (connectionCtx.socketIPDwarf) {
      if (connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN)
        connectionCtx.socketIPDwarf.close();
    }
    let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
    connectionCtx.setSocketIPDwarf(socket);

    socket.addEventListener("open", () => {
      let payload = stopMotion(motor, decelStep);
      logger("begin focusActionStop...", payload, connectionCtx);
      socketSend(socket, payload);
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (message.interface === stopMotionCmd) {
        logger("focusActionStop", message, connectionCtx);
      } else {
        logger("", message, connectionCtx);
      }
    });

    socket.addEventListener("error", (error) => {
      logger("focusActionStop error:", error, connectionCtx);
    });

    socket.addEventListener("close", (error) => {
      logger("focusActionStop close:", error, connectionCtx);
    });
  }

  function focusMinus() {
    focusAction(3, 2, 1, 305, 1, 1, 0);
  }

  function focusMinusLong() {
    focusAction(3, 1, 8, 400, 0, 1, 0);
  }

  function focusLongStop() {
    focusActionStop(3, 0);
  }

  function focusPlus() {
    focusAction(3, 2, 1, 305, 0, 1, 0);
  }

  function focusPlusLong() {
    focusAction(3, 1, 8, 400, 1, 1, 0);
  }

  function focusAutoAstro() {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }

    //socket connects to Dwarf
    if (connectionCtx.socketIPDwarf) {
      if (connectionCtx.socketIPDwarf.readyState === WebSocket.OPEN)
        connectionCtx.socketIPDwarf.close();
    }
    let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
    connectionCtx.setSocketIPDwarf(socket);

    socket.addEventListener("open", () => {
      let payload = astroAutofocus();
      logger("begin astroAutofocus...", payload, connectionCtx);
      socketSend(socket, payload);
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (message.interface === astroAutofocusCmd) {
        logger("astroAutofocus", message, connectionCtx);
      } else {
        logger("", message, connectionCtx);
      }
    });

    socket.addEventListener("error", (error) => {
      logger("astroAutofocus error:", error, connectionCtx);
    });

    socket.addEventListener("close", (error) => {
      logger("astroAutofocus close:", error, connectionCtx);
    });
  }

  function renderRecordButton() {
    console.log("Record Button");
    // don't have clickable record button if the setting menu is shown
    if (showSettingsMenu) {
      console.log("Record Button1");
      return <RecordButton />;
      // display clickable record button if all fields are completed
    } else if (validSettings) {
      console.log("Record Button2");
      if (isRecording) {
        console.log("Record Button3");
        return <RecordingButton onClick={stopAstroPhotoHandler} />;
      } else if (endRecording) {
        console.log("Record Button4");
        // Live Button is on
        return <RecordButton title="End of Recording" />;
      } else {
        console.log("Record Button OK");
        return (
          <RecordButton
            onClick={takeAstroPhotoHandler}
            title="Start Recording"
          />
        );
      }
      // if fields are not filled in, display warning
    } else {
      return (
        <>
          <OverlayTrigger
            placement="left"
            delay={{ show: 100, hide: 200 }}
            overlay={renderRecordButtonWarning}
          >
            <svg
              height="100%"
              version="1.1"
              viewBox="0 0 64 64"
              width="100%"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 32C2 15.4317 15.4317 2 32 2C48.5683 2 62 15.4317 62 32C62 48.5683 48.5683 62 32 62C15.4317 62 2 48.5683 2 32Z"
                fill="none"
                opacity="1"
                stroke="currentColor"
                strokeLinecap="butt"
                strokeLinejoin="round"
                strokeWidth="4"
              />
              <path
                d="M21 32C21 25.9249 25.9249 21 32 21C38.0751 21 43 25.9249 43 32C43 38.0751 38.0751 43 32 43C25.9249 43 21 38.0751 21 32Z"
                fill="currentColor"
                fillRule="nonzero"
                opacity="1"
                stroke="currentColor"
                strokeLinecap="butt"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </OverlayTrigger>
        </>
      );
    }
  }

  const renderRecordButtonWarning = (props: any) => {
    if (showSettingsMenu) {
      return <></>;
    }

    return (
      <Tooltip id="button-tooltip" {...props}>
        You must set the camera settings.
      </Tooltip>
    );
  };

  return (
    <ul className="nav nav-pills flex-column mb-auto border">
      <li className={`nav-item ${styles.box}`}>
        <Link href="#" className="">
          Astro
        </Link>
      </li>
      <li className={`nav-item ${styles.box}`}>
        <Link href="#" className="" title="Show Settings">
          <OverlayTrigger
            trigger="click"
            placement={"left"}
            show={showSettingsMenu}
            onToggle={() => setShowSettingsMenu((p) => !p)}
            overlay={
              <Popover id="popover-positioned-left">
                <Popover.Body>
                  <ImagingAstroSettings
                    setValidSettings={setValidSettings}
                    validSettings={validSettings}
                    setShowSettingsMenu={setShowSettingsMenu}
                  />
                </Popover.Body>
              </Popover>
            }
          >
            <i className="bi bi-sliders" style={{ fontSize: "1.75rem" }}></i>
          </OverlayTrigger>
        </Link>
      </li>
      <li className={`nav-item ${styles.box}`}>
        <Link href="#" className="">
          {renderRecordButton()}
        </Link>
      </li>
      <li className={`nav-item ${styles.box}`}>
        {showWideAngle && (
          <Link
            href="#"
            className=""
            onClick={() => {
              setShowWideangle((prev) => !prev);
              setShowWideAngle((prev) => !prev);
            }}
            title="Show Wideangle"
          >
            <i
              className="bi bi-pip"
              style={{
                fontSize: "1.75rem",
                transform: "rotate(180deg)",
                display: "inline-block",
              }}
            ></i>
          </Link>
        )}
        {!showWideAngle && (
          <Link
            href="#"
            className=""
            onClick={() => {
              setShowWideangle((prev) => !prev);
              setShowWideAngle((prev) => !prev);
            }}
            title="Hide Wideangle"
          >
            <i
              className="bi bi-pip"
              style={{
                fontSize: "1.75rem",
                transform: "rotate(180deg)",
                display: "inline-block",
              }}
            ></i>
          </Link>
        )}
      </li>
      {!isRecording && connectionCtx.imagingSession.startTime && (
        <li className={`nav-item ${styles.box}`}>
          <Link href="#" className="" onClick={endPreview}>
            Live
          </Link>
        </li>
      )}
      <hr />
      {!isRecording && !endRecording && (
        <li className={`nav-item ${styles.box}`}>
          <Link
            href="#"
            className=""
            onClick={focusAutoAstro}
            title="Astro Auto Focus"
          >
            <i
              className="icon-bullseye"
              style={{
                fontSize: "2rem",
              }}
            ></i>
          </Link>
        </li>
      )}
      <hr />
      {!isRecording && !endRecording && (
        <li className={`nav-item ${styles.box}`}>
          <Link href="#" className="" onClick={focusPlus} title="Focus + Click">
            <i
              className="icon-plus-squared-alt"
              style={{
                fontSize: "2rem",
              }}
            ></i>
          </Link>
        </li>
      )}
      <hr />
      {!isRecording && !endRecording && (
        <li className={`nav-item ${styles.box}`}>
          <Link
            href="#"
            className=""
            onClick={focusMinus}
            title="Focus - Click"
          >
            <i
              className="icon-minus-squared-alt"
              style={{
                fontSize: "2rem",
              }}
            ></i>
          </Link>
        </li>
      )}
      <hr />
      {!isRecording && !endRecording && (
        <li className={`nav-item ${styles.box}`}>
          <Link
            href="#"
            className=""
            onMouseDown={focusPlusLong}
            onMouseUp={focusLongStop}
            title="Focus + Long Press"
          >
            <i
              className="icon-plus-squared"
              style={{
                fontSize: "2rem",
              }}
            ></i>
          </Link>
        </li>
      )}
      <hr />
      {!isRecording && !endRecording && (
        <li className={`nav-item ${styles.box}`}>
          <Link
            href="#"
            className=""
            onMouseDown={focusMinusLong}
            onMouseUp={focusLongStop}
            title="Focus - Long Press"
          >
            <i
              className="icon-minus-squared"
              style={{
                fontSize: "2rem",
              }}
            ></i>
          </Link>
        </li>
      )}
    </ul>
  );
}
