/*  eslint-disable @next/next/no-img-element */

import { useState, useContext, useEffect } from "react";
import Link from "next/link";

import {
  wsURL,
  telephotoCamera,
  telephotoURL,
  wideangleCamera,
  wideangleURL,
  socketSend,
  cameraWorkingState,
  statusWorkingStateTelephotoCmd,
  DwarfIP,
} from "dwarfii_api";
import styles from "@/components/DwarfCameras.module.css";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { logger } from "@/lib/logger";
import { turnOnCameraFn } from "@/lib/dwarf_utils";

type PropType = {
  showWideangle: boolean;
};

export default function DwarfCameras(props: PropType) {
  const { showWideangle } = props;
  let connectionCtx = useContext(ConnectionContext);

  useEffect(() => {
    // NOTE: checkCameraStatus only works with telephotoCamera
    checkCameraStatus(telephotoCamera);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [telephotoCameraStatus, setTelephotoCameraStatus] = useState<
    string | undefined
  >("off");
  const [wideangleCameraStatus, setWideangleCameraStatus] = useState<
    string | undefined
  >("off");

  let IPDwarf = connectionCtx.IPDwarf || DwarfIP;

  function turnOnCameraHandler(cameraId: number) {
    if (cameraId === telephotoCamera) {
      turnOnCameraFn(telephotoCamera, connectionCtx);
      setTelephotoCameraStatus("on");
    } else {
      turnOnCameraFn(wideangleCamera, connectionCtx);
      setWideangleCameraStatus("on");
    }
  }

  function checkCameraStatus(camera: number) {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }

    let socket = new WebSocket(wsURL(connectionCtx.IPDwarf));
    socket.addEventListener("open", () => {
      let payload = cameraWorkingState(camera);
      logger("start cameraWorkingState...", payload, connectionCtx);
      socketSend(socket, payload);
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (message.interface === statusWorkingStateTelephotoCmd) {
        let cameraName = camera === 0 ? "telephoto" : "wideangle";
        if (message.camState === 1) {
          logger(cameraName + " open", {}, connectionCtx);
        } else {
          logger(cameraName + " closed", {}, connectionCtx);
          camera === 0
            ? setTelephotoCameraStatus("off")
            : setWideangleCameraStatus("off");
        }
      }
    });

    socket.addEventListener("error", (error) => {
      logger("cameraWorkingState error:", error, connectionCtx);
    });

    socket.addEventListener("close", (error) => {
      logger("cameraWorkingState close:", error, connectionCtx);
    });
  }

  function renderWideAngle() {
    return (
      <div className={`${showWideangle ? "" : "d-none"}`}>
        <img
          onLoad={() => setWideangleCameraStatus("on")}
          src={wideangleURL(IPDwarf)}
          alt="livestream for wideangle camera"
          className={styles.wideangle}
        ></img>
      </div>
    );
  }

  function renderMainCamera() {
    // TODO: use rawPreviewURL
    return (
      <div>
        <img
          onLoad={() => setTelephotoCameraStatus("on")}
          src={telephotoURL(IPDwarf)}
          alt="livestream for telephoto camera"
          className={styles.telephoto}
        ></img>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      {wideangleCameraStatus === "off" && (
        <div className="py-2 clearfix">
          <div className="float-end">
            <button
              className="btn btn-primary"
              onClick={() => turnOnCameraHandler(wideangleCamera)}
            >
              Turn on wideangle camera
            </button>
            <br />
            <Link href={wideangleURL(IPDwarf)}>{wideangleURL(IPDwarf)}</Link>
          </div>
        </div>
      )}
      {telephotoCameraStatus === "off" && (
        <div className="py-2">
          <div className="float-end">
            <button
              className="btn btn-primary"
              onClick={() => turnOnCameraHandler(telephotoCamera)}
            >
              Turn on telephoto camera
            </button>
            <br />
            <Link href={telephotoURL(IPDwarf)}>{telephotoURL(IPDwarf)}</Link>
          </div>
        </div>
      )}
      {renderWideAngle()}
      {renderMainCamera()}
    </div>
  );
}
