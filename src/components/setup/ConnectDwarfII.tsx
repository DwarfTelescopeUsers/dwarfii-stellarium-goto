import { useContext, useState } from "react";

import {
  wsURL,
  statusTelephotoCmd,
  statusWideangleCmd,
  cameraSettings,
  socketSend,
  DwarfIP,
} from "dwarfii_api";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { saveConnectionStatusDB } from "@/db/db_utils";

import { logger } from "@/lib/logger";

export default function ConnectDwarf() {
  let connectionCtx = useContext(ConnectionContext);

  const [connecting, setConnecting] = useState(false);

  function checkConnection() {
    setConnecting(true);

    let IPDwarf = connectionCtx.IPDwarf || DwarfIP;

    //socket connects to Dwarf
    let socket = new WebSocket(wsURL(IPDwarf));

    socket.addEventListener("open", () => {
      let options = cameraSettings();
      logger("start cameraSettings...", options, connectionCtx);
      socketSend(socket, options);
    });

    // close socket is request takes too long
    let closeSocketTimer = setTimeout(() => {
      setConnecting(false);
      connectionCtx.setConnectionStatus(false);
      saveConnectionStatusDB(false);
      socket.close();
    }, 3000);

    socket.addEventListener("message", (event) => {
      clearTimeout(closeSocketTimer);
      setConnecting(false);

      let message = JSON.parse(event.data);
      if (
        message.interface === statusTelephotoCmd ||
        message.interface === statusWideangleCmd
      ) {
        logger("cameraSettings:", message, connectionCtx);
        connectionCtx.setConnectionStatus(true);
        saveConnectionStatusDB(true);
      } else {
        logger("", message, connectionCtx);
      }
    });

    socket.addEventListener("error", (error) => {
      logger("cameraSettings error:", error, connectionCtx);
      clearTimeout(closeSocketTimer);
      setConnecting(false);
      connectionCtx.setConnectionStatus(false);
      saveConnectionStatusDB(false);
    });

    socket.addEventListener("close", (error) => {
      logger("cameraSettings close:", error, connectionCtx);
      clearTimeout(closeSocketTimer);
      setConnecting(false);
      connectionCtx.setConnectionStatus(false);
      saveConnectionStatusDB(false);
    });
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
