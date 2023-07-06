import type { Dispatch, SetStateAction } from "react";
import { useContext, useState } from "react";
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

  function isValid() {
    let errors = validateAstroSettings(connectionCtx.astroSettings as any);
    return (
      Object.keys(errors).length === 0 &&
      Object.keys(connectionCtx.astroSettings).length > 0
    );
  }

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [validSettings, setValidSettings] = useState(isValid());
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTimer, setSessionTimer] = useState<any>();

  function takeAstroPhotoHandler() {
    if (connectionCtx.IPDwarf == undefined) {
      return;
    }
    if (validSettings === false) {
      return;
    }

    if (!sessionTimer) {
      let timer = setInterval(() => {
        let time = calculateSessionTime(connectionCtx);
        if (time) {
          connectionCtx.setImagingSession((prev) => {
            prev["sessionElaspsedTime"] = time as string;
            return { ...prev };
          });
        }
      }, 2000);
      setSessionTimer(timer);
    }

    let now = Date.now();
    connectionCtx.setImagingSession((prev) => {
      prev.startTime = now;
      return { ...prev };
    });
    setIsRecording(true);
    saveImagingSessionDb("startTime", now.toString());

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
        // BUG: dwarf does not return message for every image taken
        logger("takeAstroPhoto count:", message, connectionCtx);
        connectionCtx.setImagingSession((prev) => {
          prev["imagesTaken"] = message.currentCount;
          return { ...prev };
        });
        saveImagingSessionDb("imagesTaken", message.currentCount.toString());

        // update UI once imaging session is done imaging
        if (message.currentCount === connectionCtx.astroSettings.count) {
          endImagingSession();
        }
      } else {
        logger("", message, connectionCtx);
      }
    });

    socket.addEventListener("error", (err) => {
      logger("takeAstroPhoto error:", err, connectionCtx);
    });
  }

  function stopAstroPhotoHandler() {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }

    endImagingSession();

    let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
    socket.addEventListener("open", () => {
      // BUG: 10015 stop RAW images does not work. Camera continues taking
      // photos.
      let payload = stopAstroPhoto();
      logger("begin stopAstroPhoto...", payload, connectionCtx);
      socketSend(socket, payload);
    });

    socket.addEventListener("message", (event) => {
      // BUG: dwarf does not return message for stopAstroPhoto
      let message = JSON.parse(event.data);
      if (message.interface === stopAstroPhotoCmd) {
        logger("stopAstroPhoto", message, connectionCtx);
      } else {
        logger("", message, connectionCtx);
      }
    });

    socket.addEventListener("error", (error) => {
      logger("stopAstroPhoto error:", error, connectionCtx);
    });
  }

  function endPreview() {
    connectionCtx.setImagingSession({} as ImagingSession);
    removeImagingSessionDb();

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

  function endImagingSession() {
    clearInterval(sessionTimer);
    setSessionTimer(undefined);
    setIsRecording(false);
  }

  function renderRecordButton() {
    // don't have clickable record button if the setting menu is shown
    if (showSettingsMenu) {
      return <RecordButton />;
      // display clickable record button if all fields are completed
    } else if (validSettings) {
      if (isRecording) {
        return <RecordingButton onClick={stopAstroPhotoHandler} />;
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
