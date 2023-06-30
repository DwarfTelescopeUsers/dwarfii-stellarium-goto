import type { Dispatch, SetStateAction } from "react";
import { useContext, useState } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Tooltip from "react-bootstrap/Tooltip";

import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  wsURL,
  takeAstroPhoto,
  takeAstroPhotoCmd,
  socketSend,
} from "dwarfii_api";
import ImagingAstroSettings from "@/components/imaging/ImagingAstroSettings";
import RecordingButton from "@/components/icons/RecordingButton";
import RecordButton from "@/components/icons/RecordButton";

type PropType = {
  setShowWideangle: Dispatch<SetStateAction<boolean>>;
};

export default function ImagingMenu(props: PropType) {
  const { setShowWideangle } = props;
  let connectionCtx = useContext(ConnectionContext);

  const [showPopover, setShowPopover] = useState(false);
  const [validSettings, setValidSettings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  function takeAstroPhotoHandler() {
    if (connectionCtx.IPDwarf == undefined) {
      return;
    }
    if (validSettings === false) {
      return;
    }

    setIsRecording(true);
    const socket = new WebSocket(wsURL(connectionCtx.IPDwarf));

    socket.addEventListener("open", () => {
      console.log("start takeAstroPhoto...");

      let payload = takeAstroPhoto(
        connectionCtx.astroSettings.rightAcension as string,
        connectionCtx.astroSettings.declination as string,
        connectionCtx.astroSettings.exposure as number,
        connectionCtx.astroSettings.gain as number,
        connectionCtx.astroSettings.binning as number,
        connectionCtx.astroSettings.count as number,
        connectionCtx.astroSettings.fileFormat as number
      );
      socketSend(socket, payload);
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (message.interface === takeAstroPhotoCmd) {
        console.log("takeAstroPhoto:", message);
      } else {
        console.log(message);
      }
    });

    socket.addEventListener("error", (err) => {
      console.log("takeAstroPhoto error:", err);
    });
  }

  function stopAstroPhotoHandler() {
    setIsRecording(false);
  }

  function renderRecordButton() {
    if (validSettings) {
      if (isRecording) {
        return <RecordingButton onClick={stopAstroPhotoHandler} />;
      } else {
        return <RecordButton onClick={takeAstroPhotoHandler} />;
      }
    } else {
      return (
        <>
          <OverlayTrigger
            trigger="click"
            placement="left"
            delay={{ show: 250, hide: 400 }}
            overlay={renderTooltip}
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

  const renderTooltip = (props: any) => (
    <Tooltip id="button-tooltip" {...props}>
      You must set the camera settings.
    </Tooltip>
  );

  return (
    <ul className="nav nav-pills  flex-column mb-auto  border">
      <li className="nav-item ">
        <a href="#" className="nav-link py-2 link-body-emphasis">
          <OverlayTrigger
            trigger="click"
            placement={"left"}
            show={showPopover}
            onToggle={() => setShowPopover((p) => !p)}
            overlay={
              <Popover id="popover-positioned-left">
                <Popover.Body>
                  <ImagingAstroSettings setValidSettings={setValidSettings} />
                </Popover.Body>
              </Popover>
            }
          >
            <i className="bi bi-sliders" style={{ fontSize: "1.75rem" }}></i>
          </OverlayTrigger>
        </a>
      </li>
      <li className="nav-item">
        <a href="#" className="nav-link py-2 link-body-emphasis">
          {renderRecordButton()}
        </a>
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
