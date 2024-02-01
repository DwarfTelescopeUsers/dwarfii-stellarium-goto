import { useContext, useState } from "react";
import type { FormEvent } from "react";

import {
  wsURL,
  statusTelephotoCmd,
  statusWideangleCmd,
  test_apiV2,
  analysePacket
} from "dwarfii_api";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  saveConnectionStatusDB,
  saveInitialConnectionTimeDB,
  saveIPDwarfDB,
} from "@/db/db_utils";
import { logger } from "@/lib/logger";

export default function ConnectDwarf() {
  let connectionCtx = useContext(ConnectionContext);

  const [connecting, setConnecting] = useState(false);

  function checkConnection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setConnecting(true);

    const formData = new FormData(e.currentTarget);
    const formIP = formData.get("ip");
    let IPDwarf = formIP?.toString();

    if (IPDwarf == undefined) {
      return;
    }

    setConnecting(true);
    connectionCtx.setIPDwarf(IPDwarf);
    saveIPDwarfDB(IPDwarf);

    //socket connects to Dwarf
    let socket = new WebSocket(wsURL(IPDwarf));
    socket.binaryType = 'arraybuffer';

    socket.addEventListener("open", () => {
      // Send Command : TeleGetSystemWorkingStat
      test_apiV2(socket);
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
      console.log(" -> Receiving data .....");
 
     if (event.data instanceof ArrayBuffer) {
       // binary frame
      // transform data to the typed array needed
      console.log(" -> Binary data .....");
      const data_rcv = new Uint8Array(event.data);
      console.log(data_rcv);

      let decodedmessage = analysePacket(data_rcv)
      console.log(decodedmessage);

      if (
        decodedmessage === statusTelephotoCmd ||
        decodedmessage === statusWideangleCmd
      ) {
        //logger("cameraSettings:", decodedmessage, connectionCtx);
        connectionCtx.setConnectionStatus(true);
        connectionCtx.setInitialConnectionTime(Date.now());
        saveConnectionStatusDB(true);
        saveInitialConnectionTimeDB();
      } else {
        //logger("", decodedmessage, connectionCtx);
      }

     } else {
        // text frame ping ?
        console.log(" -> Test data .....");
        console.log(`Text Frame Received : ${event.data}`);
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
