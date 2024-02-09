import { useContext, useState } from "react";
import { WebSocketHandler } from "@/lib/websocket_class";

import { Dwarfii_Api, messageTeleGetSystemWorkingState } from "dwarfii_api";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  saveConnectionStatusDB,
  saveInitialConnectionTimeDB,
} from "@/db/db_utils";

export default function ConnectDwarf() {
  let connectionCtx = useContext(ConnectionContext);

  const [connecting, setConnecting] = useState(false);
  const [slavemode, setSlavemode] = useState(false);

  function checkConnection() {
    const customMessageHandler = (
      result_data,
      txtInfoCommand,
      callback,
      webSocketHandlerInstance
    ) => {
      // Use webSocketHandlerInstance to access logic_data
      webSocketHandlerInstance.logic_data = false;
      if (result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_NOTIFY_SDCARD_INFO) {
        connectionCtx.setConnectionStatus(true);
        connectionCtx.setInitialConnectionTime(Date.now());
        saveConnectionStatusDB(true);
        saveInitialConnectionTimeDB();
      } else if (
        result_data.cmd ==
        Dwarfii_Api.DwarfCMD.CMD_CAMERA_TELE_GET_SYSTEM_WORKING_STATE
      ) {
        connectionCtx.setConnectionStatus(true);
      } else if (
        result_data.cmd == Dwarfii_Api.DwarfCMD.CMD_NOTIFY_WS_HOST_SLAVE_MODE
      ) {
        if (result_data.data.mode == 1) {
          console.log("WARNING SLAVE MODE");
          setSlavemode(true);
        } else {
          console.log("OK : HOST MODE");
          setSlavemode(false);
        }
      } else {
        return false;
      }
      return true;
    };

    // Create WebSocketHandler
    const webSocketHandler = new WebSocketHandler(connectionCtx, true);

    webSocketHandler.closeTimerHandler = function () {
      setConnecting(false);
    };
    webSocketHandler.onStopTimerHandler = function () {
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

    setConnecting(true);
    setSlavemode(false);

    // Send Command : cmdTeleGetSystemWorkingState
    let WS_Packet = messageTeleGetSystemWorkingState();
    let txtInfoCommand = "Connection";

    webSocketHandler.prepare(
      WS_Packet,
      customMessageHandler,
      txtInfoCommand,
      undefined
    );

    webSocketHandler.run();
  }

  function renderConnectionStatus() {
    if (connecting) {
      return <span>Connecting...</span>;
    }
    if (connectionCtx.connectionStatus === undefined) {
      return <></>;
    }
    if (connectionCtx.connectionStatus === false) {
      return <span className="text-danger">Connection failed.</span>;
    }
    if (slavemode) {
      return (
        <span className="text-warning">
          Connection successful (Slave Mode).
        </span>
      );
    }

    return <span className="text-success">Connection successful.</span>;
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
