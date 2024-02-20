/*  eslint-disable @next/next/no-img-element */

import { useState, useContext, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Link from "next/link";

import {
  Dwarfii_Api,
  DwarfIP,
  wideangleURL,
  telephotoURL,
  rawPreviewURL,
  messageCameraTeleGetAllParams,
  messageCameraWideGetAllParams,
  WebSocketHandler,
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
    checkCameraStatus(telephotoCamera);
    checkCameraStatus(wideangleCamera);
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
    if (camera == telephotoCamera) {
      setTelephotoCameraStatus("off");
    } else {
      setWideangleCameraStatus("off");
    }
    setTimeout(() => {
      checkCameraStatusLater(camera, true);
    }, 4000);
  }

  function checkCameraStatusLater(camera: number, test: boolean) {
    if (test) {
      setTelephotoCameraStatus("on");
      setWideangleCameraStatus("on");
      return;
    }
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }
    const customMessageHandlerTele = (txt_info, result_data) => {
      if (
        result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_GET_ALL_PARAMS
      ) {
        if (result_data.data.code == Dwarfii_Api.DwarfErrorCode.OK) {
          logger("telephoto open", {}, connectionCtx);
          setTelephotoCameraStatus("on");
        } else if (
          result_data.data.code ==
          Dwarfii_Api.DwarfErrorCode.CODE_CAMERA_TELE_CLOSED
        ) {
          setTelephotoCameraStatus("off");
        }
      } else {
        logger("", result_data, connectionCtx);
      }
      logger(txt_info, result_data, connectionCtx);
    };

    const customMessageHandlerWide = (txt_info, result_data) => {
      if (
        result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_CAMERA_WIDE_GET_ALL_PARAMS
      ) {
        if (result_data.data.code == Dwarfii_Api.DwarfErrorCode.OK) {
          logger("wide open", {}, connectionCtx);
          setWideangleCameraStatus("on");
        } else if (
          result_data.data.code ==
          Dwarfii_Api.DwarfErrorCode.CODE_CAMERA_WIDE_CLOSED
        ) {
          setWideangleCameraStatus("off");
        }
      } else {
        logger("", result_data, connectionCtx);
      }
      logger(txt_info, result_data, connectionCtx);
    };

    console.log("socketIPDwarf: ", connectionCtx.socketIPDwarf); // Create WebSocketHandler if need
    const webSocketHandler = connectionCtx.socketIPDwarf
      ? connectionCtx.socketIPDwarf
      : new WebSocketHandler(connectionCtx.IPDwarf);

    // Send Command : messageCameraTeleOpenCamera
    let WS_Packet;
    let cmd;
    let txtInfoCommand = "";
    let customMessageHandler;
    if (camera == telephotoCamera) {
      WS_Packet = messageCameraTeleGetAllParams();
      txtInfoCommand = "OpenTeleCamera";
      cmd = Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_GET_ALL_PARAMS;
      customMessageHandler = customMessageHandlerTele;
    } else {
      WS_Packet = messageCameraWideGetAllParams();
      txtInfoCommand = "OpenWideCamera";
      cmd = Dwarfii_Api.DwarfCMD.CMD_CAMERA_WIDE_GET_ALL_PARAMS;
      customMessageHandler = customMessageHandlerWide;
    }

    webSocketHandler.prepare(
      WS_Packet,
      txtInfoCommand,
      [cmd],
      customMessageHandler
    );

    if (!webSocketHandler.run()) {
      console.error(" Can't launch Web Socket Run Action!");
    }
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
