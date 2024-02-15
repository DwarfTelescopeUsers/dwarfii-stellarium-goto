import { useContext, useState } from "react";
import type { FormEvent } from "react";
import { WebSocketHandler } from "@/lib/websocket_class";

import {
  Dwarfii_Api,
  messageCameraTeleGetSystemWorkingState,
} from "dwarfii_api";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  saveConnectionStatusDB,
  saveInitialConnectionTimeDB,
  saveIPDwarfDB,
} from "@/db/db_utils";

export default function ConnectDwarf() {
  let connectionCtx = useContext(ConnectionContext);

  const [connecting, setConnecting] = useState(false);
  const [slavemode, setSlavemode] = useState(false);

  function checkConnection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const formIP = formData.get("ip");
    let IPDwarf = formIP?.toString();

    if (IPDwarf == undefined) {
      return;
    }

    setConnecting(true);
    connectionCtx.setIPDwarf(IPDwarf);
    saveIPDwarfDB(IPDwarf);

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
    const webSocketHandler = new WebSocketHandler(connectionCtx);

    // Force IP
    webSocketHandler.IPDwarf = IPDwarf;

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

    // Send Command : cmdCameraTeleGetSystemWorkingState
    let WS_Packet = messageCameraTeleGetSystemWorkingState();
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
      <h2>Connect to Dwarf II</h2>

      <p>
        In order for this site to connect to the Dwarf II, both the Dwarf II and
        the website must use the same wifi network.
      </p>

      <ol>
        <li className="mb-2">
          Use the Dwarf II mobile app to connect to the telescope. You can use
          the Dwarf wifi or set the Dwarf II to STA mode and use your normal
          wifi network.
        </li>
        <li className="mb-2">
          You can also enable <b>Activate Wi-Fi at Startup</b> on the Dwarf II
          with the mobile app. Then no need to use the app to Calibrate, make
          Goto and Imaging from this website.
        </li>
        <li className="mb-2">
          Visit this site on a device that is connected to the same wifi network
          as the Dwarf II.
        </li>
        <li className="mb-2">
          Enter in IP for the Dwarf II. If you are using Dwarf wifi, the IP is
          192.168.88.1. If you are using STA mode, use the IP for your wifi
          network.
        </li>
        <li className="mb-2">
          Click Connect. This site will try to connect to Dwarf II.
        </li>
        <form onSubmit={checkConnection} className="mb-3">
          <div className="row mb-3">
            <div className="col-md-1">
              <label htmlFor="ip" className="form-label">
                IP
              </label>
            </div>
            <div className="col-md-11">
              <input
                className="form-control"
                id="ip"
                name="ip"
                placeholder="127.00.00.00"
                required
                defaultValue={connectionCtx.IPDwarf}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary me-3">
            Connect
          </button>{" "}
          {renderConnectionStatus()}
        </form>
      </ol>
    </div>
  );
}
