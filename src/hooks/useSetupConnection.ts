import { useContext, useEffect } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  fetchCoordinatesDB,
  fetchInitialConnectionTimeDB,
  fetchIPStellariumDB,
  fetchPortStellariumDB,
  fetchUrlStellariumDB,
  fetchConnectionStatusStellariumDB,
  saveConnectionStatusDB,
  saveInitialConnectionTimeDB,
  fetchIPDwarfDB,
  fetchUserCurrentObservationListNameDb,
  fetchCurrentObservationListNameDb,
  fetchConnectionStatusDB,
} from "@/db/db_utils";
import { telephotoURL } from "@/lib/dwarfii_api";
import { ConnectionContextType } from "@/types";

export function useSetupConnection() {
  let connectionCtx = useContext(ConnectionContext);

  useEffect(() => {
    let timerDwarf: any;

    if (connectionCtx.connectionStatus) {
      checkDwarfConnection(connectionCtx, timerDwarf);

      // continously check connection status
      timerDwarf = setInterval(() => {
        checkDwarfConnection(connectionCtx, timerDwarf);
      }, 90 * 1000);
    }

    // load values from db
    if (connectionCtx.connectionStatus === undefined) {
      let data = fetchConnectionStatusDB();
      if (data !== undefined) connectionCtx.setConnectionStatus(data);
    }
    if (connectionCtx.latitude === undefined) {
      let data = fetchCoordinatesDB();
      if (data.latitude) {
        connectionCtx.setLatitude(data.latitude);
        connectionCtx.setLongitude(data.longitude);
      }
    }
    if (connectionCtx.initialConnectionTime === undefined) {
      let data = fetchInitialConnectionTimeDB();
      if (data !== undefined) connectionCtx.setInitialConnectionTime(data);
    }
    if (connectionCtx.IPDwarf === undefined) {
      let data = fetchIPDwarfDB();
      if (data !== undefined) connectionCtx.setIPDwarf(data);
    }
    if (connectionCtx.connectionStatusStellarium === undefined) {
      let data = fetchConnectionStatusStellariumDB();
      if (data !== undefined) connectionCtx.setConnectionStatusStellarium(data);
    }
    if (connectionCtx.IPStellarium === undefined) {
      let data = fetchIPStellariumDB();
      if (data !== undefined) connectionCtx.setIPStellarium(data);
    }
    if (connectionCtx.portStellarium === undefined) {
      let data = fetchPortStellariumDB();
      if (data !== undefined) connectionCtx.setPortStellarium(data);
    }
    if (connectionCtx.urlStellarium === undefined) {
      let data = fetchUrlStellariumDB();
      if (data !== undefined) connectionCtx.setUrlStellarium(data);
    }

    if (connectionCtx.currentObservationListName === undefined) {
      let data = fetchCurrentObservationListNameDb();
      if (data !== undefined) {
        connectionCtx.setCurrentObservationListName(data);
      }
    }

    if (connectionCtx.currentUserObservationListName === undefined) {
      let data = fetchUserCurrentObservationListNameDb();
      if (data !== undefined) {
        connectionCtx.setUserCurrentObservationListName(data);
      }
    }

    return () => {
      console.log("unmount: delete checkConnection timer");
      clearInterval(timer);
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
  fetch(telephotoURL(connectionCtx.IPDwarf), {
    signal: AbortSignal.timeout(2000),
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
      if (err.name === "AbortError") {
        console.log("Dwarf connection error");
        clearInterval(timer);

        connectionCtx.setConnectionStatus(false);
        saveConnectionStatusDB(false);
      }
    });
}
