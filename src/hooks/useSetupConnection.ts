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
  fetchAstroSettingsAllDb,
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

    // load values from db
    if (connectionCtx.connectionStatus === undefined) {
      let data = fetchConnectionStatusDB();
      if (data !== undefined) connectionCtx.setConnectionStatus(data);
    }
    if (connectionCtx.connectionStatusStellarium === undefined) {
      let data = fetchConnectionStatusStellariumDB();
      if (data !== undefined) connectionCtx.setConnectionStatusStellarium(data);
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

    if (connectionCtx.astroSettings.gain === undefined) {
      let data = fetchAstroSettingsAllDb();
      if (data !== undefined) {
        connectionCtx.setAstroSettings(data);
      }
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
        console.log("useSetupConnection err ???", err.name, err.message);
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
      if (err.name === "AbortError" || err.message === "Load failed") {
        console.log("Stellarium connection error");
        clearInterval(timer);

        connectionCtx.setConnectionStatusStellarium(false);
        saveConnectionStatusStellariumDB(false);
      } else {
        console.log("useSetupConnection err >>>", err.name, err.message);
      }
    });
}
