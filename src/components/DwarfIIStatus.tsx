import { useState, useContext, useEffect } from "react";

import {
  wsURL,
  statusTelephotoCmd,
  statusWideangleCmd,
  queryShotFieldCmd,
  cameraSettings,
  queryShotField,
  socketSend,
  binning2x2,
} from "dwarfii_api";
import { ConnectionContext } from "@/stores/ConnectionContext";

export default function DwarfIIStatus() {
  let connectionCtx = useContext(ConnectionContext);

  const [cameraSettingsData, setCameraStatusData] = useState<any>(null);
  const [shotFieldData, setShotFieldData] = useState<any>(null);

  const getCameraStatus = () => {
    if (connectionCtx.IPDwarf == undefined) {
      return;
    }

    const socket = new WebSocket(wsURL(connectionCtx.IPDwarf));

    socket.addEventListener("open", () => {
      console.log("start cameraSettings...");
      let payload = cameraSettings();
      socketSend(socket, payload);
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (
        message.interface === statusTelephotoCmd ||
        message.interface === statusWideangleCmd
      ) {
        console.log("cameraSettings:", message);
        setCameraStatusData(message);
      } else {
        console.log(message);
      }
    });

    socket.addEventListener("error", (message) => {
      console.log("cameraSettings error:", message);
    });

    socket.addEventListener("close", (message) => {
      console.log("cameraSettings close:", message);
    });
  };

  const getShotField = () => {
    if (connectionCtx.IPDwarf == undefined) {
      return;
    }
    const socket = new WebSocket(wsURL(connectionCtx.IPDwarf));

    socket.addEventListener("open", () => {
      console.log("start queryShotField...");
      let payload = queryShotField(
        connectionCtx.astroSettings.binning || binning2x2
      );
      socketSend(socket, payload);
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (message.interface === queryShotFieldCmd) {
        setShotFieldData(message);
        console.log("queryShotField:", message);
      } else {
        console.log(message);
      }
    });

    socket.addEventListener("error", (message) => {
      setShotFieldData(message);
      console.log("queryShotField error:", message);
    });

    socket.addEventListener("close", (message) => {
      console.log("queryShotField close:", message);
    });
  };

  useEffect(() => {
    getCameraStatus();
    setTimeout(() => {
      getShotField();
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <h2>ISP Parameters - Telephoto</h2>
      {cameraSettingsData && (
        <pre>{JSON.stringify(cameraSettingsData, null, 2)}</pre>
      )}
      <h2>Shot Field - Telephoto</h2>
      {shotFieldData && <pre>{JSON.stringify(shotFieldData, null, 2)}</pre>}
      <button
        className=" btn btn-primary mb-3"
        onClick={() => {
          getCameraStatus();
          setTimeout(() => {
            getShotField();
          }, 1000);
        }}
      >
        Refresh
      </button>
    </>
  );
}
