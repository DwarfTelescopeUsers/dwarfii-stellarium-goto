import { useContext, useState } from "react";

import {
  wsURL,
  statusTelephotoCmd,
  statusWideangleCmd,
  cameraSettings,
} from "@/lib/dwarf2_api";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  saveConnectionStatusDB,
  saveInitialConnectionTimeDB,
} from "@/db/db_utils";

export default function ConnectCamera() {
  let connectionCtx = useContext(ConnectionContext);

  const [connecting, setConnecting] = useState(false);

  function checkConnection() {
    setConnecting(true);

    const socket = new WebSocket(wsURL);

    socket.addEventListener("open", () => {
      console.log("start cameraSettings...");
      cameraSettings(socket);
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
        console.log("cameraSettings:", message);
        connectionCtx.setConnectionStatus(true);
        connectionCtx.setInitialConnectionTime(Date.now());
        saveConnectionStatusDB(true);
        saveInitialConnectionTimeDB();
      } else {
        console.log(message);
      }
    });

    socket.addEventListener("error", (error) => {
      console.log("cameraSettings error:", error);
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
      return <span>Connection failed.</span>;
    }

    return <span>Connection successful.</span>;
  }

  return (
    <div>
      <h2>Connect to Dwarf II</h2>

      <p>
        In order for this site to connect to the Dwarf II, both the Dwarf II and
        the website must use the Dwarf II wifi.
      </p>

      <ol>
        <li className="mb-2">
          Use the Dwarf II mobile app to connect to the telescope using the
          Dwarf II wifi.
        </li>
        <li className="mb-2">
          Visit this site on a device that is connected to the Dwarf II wifi.
        </li>
        <li className="mb-2">
          Click Connect. This site will try to connect to Dwarf II.
        </li>
      </ol>

      <button className="btn btn-primary me-3" onClick={checkConnection}>
        Connect
      </button>
      {renderConnectionStatus()}
    </div>
  );
}
