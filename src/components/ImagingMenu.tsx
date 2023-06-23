import type { Dispatch, SetStateAction } from "react";
import { useContext, useState } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";

import styles from "@/components/ImagingMenu.module.css";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  wsURL,
  takeAstroPhoto,
  takeAstroPhotoCmd,
  socketSend,
} from "dwarfii_api";
import ImagingAstroSettings from "@/components/ImagingAstroSettings";

type PropType = {
  setShowWideangle: Dispatch<SetStateAction<boolean>>;
};

export default function ImagingMenu(props: PropType) {
  const { setShowWideangle } = props;
  let connectionCtx = useContext(ConnectionContext);

  const [showPopover, setShowPopover] = useState(false);
  const [validSettings, setValidSettings] = useState(false);

  function takeAstroPhotoHandler() {
    if (connectionCtx.IPDwarf == undefined) {
      return;
    }
    const socket = new WebSocket(wsURL(connectionCtx.IPDwarf));

    socket.addEventListener("open", () => {
      console.log("start takeAstroPhoto...");

      let payload = takeAstroPhoto(
        connectionCtx.astroSettings.rightAcensionDecimal,
        connectionCtx.astroSettings.declinationDecimal,
        connectionCtx.astroSettings.exposure,
        connectionCtx.astroSettings.gain,
        connectionCtx.astroSettings.binning,
        connectionCtx.astroSettings.count,
        connectionCtx.astroSettings.fileFormat
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

  return (
    <ul className="nav flex-column">
      <li className="nav-item">
        <a
          className="nav-link d-flex align-items-center gap-2"
          href="#"
          onClick={() => setShowWideangle((prev) => !prev)}
        >
          <i
            className="bi bi-pip"
            style={{ fontSize: "2rem", transform: "rotate(180deg)" }}
          ></i>
        </a>
      </li>
      <li className="nav-item">
        <button
          className={`btn btn-primary ${styles.shootButton}`}
          onClick={takeAstroPhotoHandler}
        ></button>
      </li>
      <li className="nav-item">
        <OverlayTrigger
          trigger="click"
          key={"left"}
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
          <i className="bi bi-sliders" style={{ fontSize: "2rem" }}></i>
        </OverlayTrigger>
      </li>
    </ul>
  );
}
