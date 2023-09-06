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
  telephotoCamera,
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
};

export default function ImagingMenu(props: PropType) {
  const { setShowWideangle } = props;
  let connectionCtx = useContext(ConnectionContext);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [validSettings, setValidSettings] = useState(isValid());
  const [isRecording, setIsRecording] = useState(false);
  const [endRecording, setEndRecording] = useState(false);
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

      saveImagingSessionDb("startTime", now.toString());
      setEndRecording(false);

      //startAstroPhotoHandler

      logger("startAstroPhotoHandler current ST:", testTimer, connectionCtx);

      const socket = new WebSocket(wsURL(connectionCtx.IPDwarf));

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

            endImagingSession();
          }
        } else {
          logger("", message, connectionCtx);
        }
      });

      socket.addEventListener("error", (err) => {
        logger("takeAstroPhoto error:", err, connectionCtx);
      });

      socket.addEventListener("close", (err) => {
        logger("takeAstroPhoto close:", err, connectionCtx);
        endImagingSession();
      });
    }
  }

  function stopAstroPhotoHandler() {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }

    let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
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
      } else {
        logger("", message, connectionCtx);
      }
    });

    socket.addEventListener("error", (error) => {
      logger("stopAstroPhoto error:", error, connectionCtx);
    });

    socket.addEventListener("close", (error) => {
      logger("stopAstroPhoto close:", error, connectionCtx);
      endImagingSession();
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
    setIsRecording(false);
    setEndRecording(true);
  }

  function endPreview() {
    connectionCtx.setImagingSession({} as ImagingSession);
    removeImagingSessionDb();

    setEndRecording(false);

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

  function renderRecordButton() {
    // don't have clickable record button if the setting menu is shown
    if (showSettingsMenu) {
      return <RecordButton />;
      // display clickable record button if all fields are completed
    } else if (validSettings) {
      if (isRecording) {
        return <RecordingButton onClick={stopAstroPhotoHandler} />;
      } else if (endRecording) {
        // Live Button is on
        return <RecordButton />;
      } else {
        return <RecordButton onClick={takeAstroPhotoHandler} />;
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
        <Link href="#" className="">
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
        <Link
          href="#"
          className=""
          onClick={() => setShowWideangle((prev) => !prev)}
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
      </li>
      {!isRecording && connectionCtx.imagingSession.startTime && (
        <li className={`nav-item ${styles.box}`}>
          <Link href="#" className="" onClick={endPreview}>
            Live
          </Link>
        </li>
      )}
    </ul>
  );
}
