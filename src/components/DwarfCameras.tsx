/*  eslint-disable @next/next/no-img-element */

import { useState, useContext, useEffect } from "react";
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
  cameraWorkingState,
  statusWorkingStateTelephotoCmd,
} from "dwarfii_api";
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
  >("on");
  const [wideangleCameraStatus, setWideangleCameraStatus] = useState<
    string | undefined
  >("on");

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

  function checkCameraStatus(camera: number) {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }

    let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
    socket.addEventListener("open", () => {
      console.log("start cameraWorkingState...");
      let payload = cameraWorkingState(camera);
      socketSend(socket, payload);
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (message.interface === statusWorkingStateTelephotoCmd) {
        let cameraName = camera === 0 ? "telephoto" : "wideangle";
        if (message.camState === 1) {
          console.log(cameraName + " open");
        } else {
          console.log(cameraName + " closed");
          camera === 0
            ? setTelephotoCameraStatus("off")
            : setWideangleCameraStatus("off");
        }
      }
    });

    socket.addEventListener("error", (error) => {
      console.log("cameraWorkingState error:", error);
    });
  }

  useEffect(() => {
    // NOTE: checkCameraStatus only works with telephotoCamera
    checkCameraStatus(telephotoCamera);
  }, []);

  return (
    <div className={styles.section}>
      {telephotoCameraStatus === "off" && (
        <div>
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
        <div>
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
