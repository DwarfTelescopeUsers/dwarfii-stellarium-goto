/*  eslint-disable @next/next/no-img-element */

import { useState, useContext, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Link from "next/link";
import { WebSocketHandler } from "@/lib/websocket_class";

import {
  Dwarfii_Api,
  DwarfIP,
  wideangleURL,
  telephotoURL,
  rawPreviewURL,
  messageCameraTeleGetAllParams,
  messageCameraWideGetAllParams,
} from "dwarfii_api";

import styles from "@/components/DwarfCameras.module.css";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { logger } from "@/lib/logger";
import {
  telephotoCamera,
  wideangleCamera,
  turnOnTeleCameraFn,
  turnOnWideCameraFn,
} from "@/lib/dwarf_utils";

type PropType = {
  showWideangle: boolean;
  useRawPreviewURL: boolean;
};

export default function DwarfCameras(props: PropType) {
  const { showWideangle, useRawPreviewURL } = props;
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
      turnOnTeleCameraFn(connectionCtx);
      setTelephotoCameraStatus("on");
    } else {
      turnOnWideCameraFn(connectionCtx);
      setWideangleCameraStatus("on");
    }
  }

  function checkCameraStatus(camera: number) {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }

    const customMessageHandler = (
      result_data,
      txtInfoCommand,
      callback,
      webSocketHandlerInstance
    ) => {
      // Use webSocketHandlerInstance to access logic_data
      webSocketHandlerInstance.logic_data = false;
      if (result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_OPEN_CAMERA) {
        if (result_data.data.code == Dwarfii_Api.DwarfErrorCode.OK) {
          logger("telephoto open", {}, connectionCtx);
          setTelephotoCameraStatus("on");
          return true;
        } else {
          setTelephotoCameraStatus("off");
          return true;
        }
      } else if (
        result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_CAMERA_WIDE_OPEN_CAMERA
      ) {
        if (result_data.data.code == Dwarfii_Api.DwarfErrorCode.OK) {
          logger("wide open", {}, connectionCtx);
          setWideangleCameraStatus("on");
          return true;
        } else {
          setWideangleCameraStatus("off");
          return true;
        }
      } else {
        return false;
      }
    };

    // Create WebSocketHandler
    const webSocketHandler = new WebSocketHandler(connectionCtx, true);

    // Send Command : messageCameraTeleGetAllParams
    let WS_Packet;
    if (camera == telephotoCamera) WS_Packet = messageCameraTeleGetAllParams();
    else WS_Packet = messageCameraWideGetAllParams();
    let txtInfoCommand = "cameraWorkingState";

    webSocketHandler.prepare(
      WS_Packet,
      customMessageHandler,
      txtInfoCommand,
      undefined
    );

    webSocketHandler.run();
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
    // TODO: use rawPreviewURL vs   telephotoURL,
    return (
      <div>
        <img
          onLoad={() => setTelephotoCameraStatus("on")}
          src={
            useRawPreviewURL ? rawPreviewURL(IPDwarf) : telephotoURL(IPDwarf)
          }
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
      <TransformWrapper>
        <TransformComponent>
          {renderWideAngle()}
          {renderMainCamera()}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
