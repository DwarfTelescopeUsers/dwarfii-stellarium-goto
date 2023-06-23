/*  eslint-disable @next/next/no-img-element */

import { useState, useContext } from "react";
import {
  wsURL,
  telephotoCamera,
  telephotoURL,
  wideangleCamera,
  wideangleURL,
  turnOnCameraCmd,
  binning2x2,
  turnOnCamera,
  socketSend,
} from "@/lib/dwarfii_api";
import styles from "@/components/DwarfCameras.module.css";
import { ConnectionContext } from "@/stores/ConnectionContext";

type PropType = {
  showWideangle: boolean;
};

export default function DwarfCameras(props: PropType) {
  const { showWideangle } = props;
  let connectionCtx = useContext(ConnectionContext);

  const [telephotoCameraStatus, setTelephotoCameraStatus] = useState<
    string | undefined
  >();
  const [wideangleCameraStatus, setWideangleCameraStatus] = useState<
    string | undefined
  >();

  let IPDwarf = connectionCtx.IPDwarf || "192.168.88.1";

  function turnOnCameraHandler(cameraId: number) {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }
    let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));

    socket.addEventListener("open", () => {
      console.log("start turnOnCamera...");
      let payload = turnOnCamera(binning2x2, cameraId);
      socketSend(socket, payload);
    });

    socket.addEventListener("message", (event) => {
      cameraId === telephotoCamera
        ? setTelephotoCameraStatus("on")
        : setWideangleCameraStatus("on");

      let message = JSON.parse(event.data);
      if (message.interface === turnOnCameraCmd) {
        console.log("turnOnCamera:", message);
      } else {
        console.log(message);
      }
    });

    socket.addEventListener("error", (error) => {
      console.log("turnOnCamera error:", error);
    });
  }

  function cameraToggleHandler(cameraId: number) {
    if (cameraId === telephotoCamera) {
      turnOnCameraHandler(telephotoCamera);
      setTelephotoCameraStatus("on");
    } else {
      turnOnCameraHandler(wideangleCamera);
      setWideangleCameraStatus("on");
    }
  }

  function checkCameraStatus() {
    fetch(telephotoURL(IPDwarf), { signal: AbortSignal.timeout(2000) })
      .then(() => {
        setTelephotoCameraStatus("on");
      })
      .catch(() => {
        setTelephotoCameraStatus("off");
      });

    fetch(wideangleURL(IPDwarf), { signal: AbortSignal.timeout(2000) })
      .then(() => {
        setWideangleCameraStatus("on");
      })
      .catch(() => {
        setWideangleCameraStatus("off");
      });
  }

  checkCameraStatus();

  return (
    <div className={styles.section}>
      {telephotoCameraStatus === "off" && (
        <div className={styles.telephoto}>
          <button
            className="btn btn-primary"
            onClick={() => cameraToggleHandler(telephotoCamera)}
          >
            Turn on telephoto camera
          </button>
          <br></br>
          <a href={telephotoURL(IPDwarf)}>{telephotoURL(IPDwarf)}</a>
        </div>
      )}
      {telephotoCameraStatus === "on" && (
        <div>
          <img
            src={telephotoURL(IPDwarf)}
            alt="livestream for Dwarf 2 telephoto camera"
            className={styles.telephoto}
          ></img>
        </div>
      )}

      {showWideangle && wideangleCameraStatus === "off" && (
        <div className={styles.wideangle}>
          <button
            className="btn btn-primary"
            onClick={() => cameraToggleHandler(telephotoCamera)}
          >
            Turn on wideangle camera
          </button>
          <br></br>
          <a href={wideangleURL(IPDwarf)}>{wideangleURL(IPDwarf)}</a>
        </div>
      )}
      {showWideangle && wideangleCameraStatus === "on" && (
        <div>
          <img
            src={wideangleURL(IPDwarf)}
            alt="livestream for Dwarf 2 wideangle camera"
            className={styles.wideangle}
          ></img>
        </div>
      )}
    </div>
  );
}
