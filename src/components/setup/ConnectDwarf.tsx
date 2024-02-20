import { useContext, useState } from "react";
import type { FormEvent } from "react";

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
  saveIPDwarfDB,
} from "@/db/db_utils";
import { logger } from "@/lib/logger";

import { getAllTelescopeISPSetting } from "@/lib/dwarf_utils";

export default function ConnectDwarf() {
  let connectionCtx = useContext(ConnectionContext);

  const [connecting, setConnecting] = useState(false);
  const [slavemode, setSlavemode] = useState(false);
  const [goLive, setGoLive] = useState(false);
  const [errorTxt, setErrorTxt] = useState("");

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
      console.error("ConnectDwarf : Socket Close!");
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
      : new WebSocketHandler(IPDwarf);

    connectionCtx.setSocketIPDwarf(webSocketHandler);

    // Force IP
    webSocketHandler.setIpDwarf(IPDwarf);

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

    // Send Commands : cmdCameraTeleGetSystemWorkingState
    let WS_Packet = messageCameraTeleGetSystemWorkingState();
    let WS_Packet1 = messageCameraTeleOpenCamera();
    let WS_Packet2 = messageCameraWideOpenCamera();
    let txtInfoCommand = "Connection";

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
