import { useContext, useState } from "react";

import {
  Dwarfii_Api,
  messageCameraTeleGetSystemWorkingState,
  messageCameraTeleOpenCamera,
  messageCameraWideOpenCamera,
  WebSocketHandler,
} from "dwarfii_api";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  saveConnectionStatusDB,
  saveInitialConnectionTimeDB,
} from "@/db/db_utils";
import { logger } from "@/lib/logger";

import { getAllTelescopeISPSetting } from "@/lib/dwarf_utils";

export default function ConnectDwarf() {
  let connectionCtx = useContext(ConnectionContext);

  const [connecting, setConnecting] = useState(false);
  const [slavemode, setSlavemode] = useState(false);
  const [goLive, setGoLive] = useState(false);
  const [errorTxt, setErrorTxt] = useState("");

  function checkConnection() {
    const customMessageHandler = (txt_info, result_data) => {
      if (result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_NOTIFY_SDCARD_INFO) {
        connectionCtx.setConnectionStatus(true);
        connectionCtx.setInitialConnectionTime(Date.now());
        saveConnectionStatusDB(true);
        saveInitialConnectionTimeDB();
      } else if (
        result_data.cmd ==
        Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_GET_SYSTEM_WORKING_STATE
      ) {
        if (result_data.data.code == Dwarfii_Api.DwarfErrorCode.OK) {
          connectionCtx.setConnectionStatus(true);
          getAllTelescopeISPSetting(connectionCtx);
        } else {
          connectionCtx.setConnectionStatus(true);
          if (result_data.data.errorTxt)
            setErrorTxt(errorTxt + " " + result_data.data.errorTxt);
          else setErrorTxt(errorTxt + " " + "Error: " + result_data.data.code);
        }
      } else if (
        result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_NOTIFY_WS_HOST_SLAVE_MODE
      ) {
        if (result_data.data.mode == 1) {
          console.log("WARNING SLAVE MODE");
          connectionCtx.setConnectionStatusSlave(true);
          setSlavemode(true);
        } else {
          console.log("OK : HOST MODE");
          connectionCtx.setConnectionStatusSlave(false);
          setSlavemode(false);
        }
      } else if (
        result_data.cmd ==
        Dwarfii_Api.DwarfCMD.CMD_NOTIFY_STATE_CAPTURE_RAW_LIVE_STACKING
      ) {
        if (
          result_data.data.state ==
          Dwarfii_Api.OperationState.OPERATION_STATE_STOPPED
        ) {
          if (result_data.data.code == Dwarfii_Api.DwarfErrorCode.OK) {
            if (result_data.data.errorTxt)
              setErrorTxt(errorTxt + " " + result_data.data.errorTxt);
            else
              setErrorTxt(errorTxt + " " + "Error: " + result_data.data.code);
          }
          logger("Need Go LIVE", {}, connectionCtx);
          setGoLive(true);
        }
      } else {
        logger("", result_data, connectionCtx);
      }
      logger(txt_info, result_data, connectionCtx);
    };

    const customErrorHandler = () => {
      console.error("ConnectDwarf2 : Socket Close!");
      setConnecting(false);
      connectionCtx.setConnectionStatus(false);
      saveConnectionStatusDB(false);
    };

    const customStateHandler = (state) => {
      setConnecting(false);
      connectionCtx.setConnectionStatus(state);
      saveConnectionStatusDB(state);
    };

    console.log("socketIPDwarf: ", connectionCtx.socketIPDwarf); // Create WebSocketHandler if need
    const webSocketHandler = connectionCtx.socketIPDwarf
      ? connectionCtx.socketIPDwarf
      : new WebSocketHandler(connectionCtx.IPDwarf);

    connectionCtx.setSocketIPDwarf(webSocketHandler);

    webSocketHandler.closeTimerHandler = () => {
      setConnecting(false);
    };
    webSocketHandler.onStopTimerHandler = () => {
      setConnecting(false);
      saveConnectionStatusDB(false);
    };

    // close socket is request takes too long
    webSocketHandler.closeSocketTimer = setTimeout(() => {
      webSocketHandler.handleClose("");
      console.log(" -> Close Timer.....");
      setConnecting(false);
      connectionCtx.setConnectionStatus(false);
      saveConnectionStatusDB(false);
    }, 5000);

    setSlavemode(false);
    setGoLive(false);
    connectionCtx.setConnectionStatusSlave(false);
    setConnecting(true);

    // Send Command : cmdCameraTeleGetSystemWorkingState
    let WS_Packet = messageCameraTeleGetSystemWorkingState();
    let WS_Packet1 = messageCameraTeleOpenCamera();
    let WS_Packet2 = messageCameraWideOpenCamera();
    let txtInfoCommand = "Connection2";

    webSocketHandler.prepare(
      [WS_Packet, WS_Packet1, WS_Packet2],
      txtInfoCommand,
      [
        "*", // Get All Data
        Dwarfii_Api.DwarfCMD.CMD_NOTIFY_SDCARD_INFO,
        Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_GET_SYSTEM_WORKING_STATE,
        Dwarfii_Api.DwarfCMD.CMD_NOTIFY_WS_HOST_SLAVE_MODE,
        Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_OPEN_CAMERA,
        Dwarfii_Api.DwarfCMD.CMD_CAMERA_WIDE_OPEN_CAMERA,
        Dwarfii_Api.DwarfCMD.CMD_NOTIFY_STATE_CAPTURE_RAW_LIVE_STACKING,
      ],
      customMessageHandler,
      customStateHandler,
      customErrorHandler
    );

    if (!webSocketHandler.run()) {
      console.error(" Can't launch Web Socket Run Action!");
    }
  }

  function renderConnectionStatus() {
    let goLiveMessage = "";
    if (goLive) {
      goLiveMessage = "Need Go Live";
    }
    if (connecting) {
      return <span>Connecting...</span>;
    }
    if (connectionCtx.connectionStatus === undefined) {
      return <></>;
    }
    if (connectionCtx.connectionStatus === false) {
      return <span className="text-danger">Connection failed{errorTxt}.</span>;
    }
    if (slavemode) {
      return (
        <span className="text-warning">
          Connection successful (Slave Mode) {goLiveMessage}
          {errorTxt}.
        </span>
      );
    }

    return (
      <span className="text-success">
        Connection successful. {goLiveMessage}
        {errorTxt}
      </span>
    );
  }

  return (
    <div>
      <button className="btn btn-primary me-3" onClick={checkConnection}>
        Connect
      </button>{" "}
      {renderConnectionStatus()}
    </div>
  );
}
