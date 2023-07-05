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
} from "dwarfii_api";
import ImagingAstroSettings from "@/components/imaging/ImagingAstroSettings";
import RecordingButton from "@/components/icons/RecordingButton";
import RecordButton from "@/components/icons/RecordButton";
import { logger } from "@/lib/logger";
import { validateAstroSettings } from "@/components/imaging/form_validations";
import { AstroSession } from "@/types";
import { saveAstroSessionDb, removeAstroSessionDb } from "@/db/db_utils";

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

  function takeAstroPhotoHandler() {
    if (connectionCtx.IPDwarf == undefined) {
      return;
    }
    if (validSettings === false) {
      return;
    }

    let now = Date.now();
    connectionCtx.setAstroSession((prev) => {
      prev.startTime = now;
      return { ...prev };
    });
    setIsRecording(true);
    saveAstroSessionDb("startTime", now.toString());

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
      } else if (message.interface === numberRawImagesCmd) {
        logger("takeAstroPhoto count", message, connectionCtx);
        connectionCtx.setAstroSession((prev) => {
          prev["imagesTaken"] = message.currentCount;
          return { ...prev };
        });
        saveAstroSessionDb("imagesTaken", message.currentCount.toString());
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

    connectionCtx.setAstroSession({} as AstroSession);
    removeAstroSessionDb();
    setIsRecording(false);

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
      } else {
        logger("", message, connectionCtx);
      }
    });

    socket.addEventListener("error", (error) => {
      logger("stopAstroPhoto error:", error, connectionCtx);
    });
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
            trigger="hover"
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
    <ul className="nav nav-pills  flex-column mb-auto  border">
      <li className="nav-item ">
        <Link href="#" className="nav-link my-3 py-2 link-body-emphasis">
          Live
        </Link>
      </li>
      <li className="nav-item ">
        <Link href="#" className="nav-link my-3 py-2 link-body-emphasis">
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
      <li className="nav-item">
        <Link href="#" className="nav-link my-3 py-2 link-body-emphasis">
          {renderRecordButton()}
        </Link>
      </li>
      <li>
        <a
          href="#"
          className="nav-link py-2 link-body-emphasis"
          onClick={() => setShowWideangle((prev) => !prev)}
        >
          <i
            className="bi bi-pip"
            style={{ fontSize: "1.75rem", transform: "rotate(180deg)" }}
          ></i>
        </a>
      </li>
    </ul>
  );
}
