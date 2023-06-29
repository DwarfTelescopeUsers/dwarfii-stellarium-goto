import { useContext, useEffect } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  saveConnectionStatusDB,
  saveInitialConnectionTimeDB,
  saveConnectionStatusStellariumDB,
} from "@/db/db_utils";
import { utcURL } from "dwarfii_api";
import { ConnectionContextType } from "@/types";

export function useSetupConnection() {
  let connectionCtx = useContext(ConnectionContext);

  useEffect(() => {
    let timerDwarf: any;
    let timerStellarium: any;

    if (connectionCtx.connectionStatus) {
      checkDwarfConnection(connectionCtx, timerDwarf);

      // continously check connection status
      timerDwarf = setInterval(() => {
        checkDwarfConnection(connectionCtx, timerDwarf);
      }, 90 * 1000);
    }

    if (connectionCtx.connectionStatusStellarium) {
      checkStellariumConnection(connectionCtx, timerStellarium);

      // continously check connection status
      timerStellarium = setInterval(() => {
        checkStellariumConnection(connectionCtx, timerStellarium);
      }, 90 * 1000);
    }

    return () => {
      if (connectionCtx.connectionStatus === false) {
        console.log("unmount: delete checkDwarfConnection timer");
        clearInterval(timerDwarf);
      }
      if (connectionCtx.connectionStatusStellarium === false) {
        console.log("unmount: delete checkStellariumConnection timer");
        clearInterval(timerStellarium);
      }
    };
  }, [connectionCtx]);
}

function checkDwarfConnection(
  connectionCtx: ConnectionContextType,
  timer: any
) {
  if (connectionCtx.IPDwarf === undefined) {
    return;
  }
  // if we can't connect to camera in 2 seconds, reset connection data
  fetch(utcURL(connectionCtx.IPDwarf), {
    signal: AbortSignal.timeout(2000),
    mode: "no-cors",
  })
    .then(() => {
      console.log("Dwarf connection ok");
      if (!connectionCtx.connectionStatus) {
        connectionCtx.setConnectionStatus(true);
        saveConnectionStatusDB(true);
        saveInitialConnectionTimeDB();
      }
    })
    .catch((err) => {
      if (err.name === "AbortError" || err.message == "Failed to fetch") {
        console.log("Dwarf connection error");
        clearInterval(timer);

        connectionCtx.setConnectionStatus(false);
        saveConnectionStatusDB(false);
      } else {
        console.log("checkDwarfConnection err ???", err.name, err.message);
      }
    });
}

function checkStellariumConnection(
  connectionCtx: ConnectionContextType,
  timer: any
) {
  if (connectionCtx.IPStellarium === undefined) {
    return;
  }

  // if we can't connect to camera in 2 seconds, reset connection data
  let url = `http://${connectionCtx.IPStellarium}:${connectionCtx.portStellarium}`;
  console.log("checkStellariumConnection...");
  fetch(url, {
    signal: AbortSignal.timeout(2000),
  })
    .then(() => {
      console.log("Stellarium connection ok");
      if (!connectionCtx.connectionStatusStellarium) {
        connectionCtx.setConnectionStatusStellarium(true);
        saveConnectionStatusStellariumDB(true);
      }
    })
    .catch((err) => {
      if (
        err.name === "AbortError" ||
        err.message === "Load failed" ||
        err.message === "Failed to fetch"
      ) {
        console.log("Stellarium connection error");
        clearInterval(timer);

        connectionCtx.setConnectionStatusStellarium(false);
        saveConnectionStatusStellariumDB(false);
      } else {
        console.log("checkStellariumConnection err >>>", err.name, err.message);
      }
    });
}
