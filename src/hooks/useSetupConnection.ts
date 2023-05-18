import { useContext, useEffect } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  deleteSettings,
  fetchCoordinatesDB,
  fetchInitialConnectionTimeDB,
} from "@/db/db_utils";
import { checkConnectionLoop } from "@/lib/connection_status";

export function useSetupConnection() {
  let connectionCtx = useContext(ConnectionContext);

  useEffect(() => {
    let timer: any;

    checkConnectionLoop(connectionCtx, timer);

    // continously check connection status
    if (connectionCtx.connectionStatus) {
      timer = setInterval(() => {
        checkConnectionLoop(connectionCtx, timer);
      }, 90 * 1000);
    }

    // load values from db
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

    return () => {
      console.log("unmount: delete checkConnectionLoop timer");
      clearInterval(timer);
    };
  }, [connectionCtx]);
}
