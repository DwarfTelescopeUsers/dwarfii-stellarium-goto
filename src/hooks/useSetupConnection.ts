import { useContext, useEffect } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  expiredSession,
  deleteSettings,
  fetchGainDB,
  fetchBinningDB,
  fetchExposureDB,
  fetchFileFormatDB,
  fetchIRDB,
  fetchCoordinatesDB,
  fetchRADecDB,
  fetchInitialConnectionTimeDB,
} from "@/db/db_utils";
import { checkConnectionLoop } from "@/lib/connection_status";

export function useSetupConnection() {
  let connectionCtx = useContext(ConnectionContext);

  useEffect(() => {
    let timer: any;

    // delete all setings if it is expired
    if (expiredSession()) {
      console.log("expiredSession true");
      deleteSettings();
      connectionCtx.deleteSettings();
    } else {
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
      if (connectionCtx.RA === undefined) {
        let data = fetchRADecDB();
        if (data.RA) {
          connectionCtx.setRA(data.RA);
          connectionCtx.setDeclination(data.declination);
        }
      }
      if (connectionCtx.initialConnectionTime === undefined) {
        let data = fetchInitialConnectionTimeDB();
        if (data !== undefined) connectionCtx.setInitialConnectionTime(data);
      }
      if (connectionCtx.binning === undefined) {
        let data = fetchBinningDB();
        if (data !== undefined) connectionCtx.setBinning(data);
      }
      if (connectionCtx.exposure === undefined) {
        let data = fetchExposureDB();
        if (data !== undefined) connectionCtx.setExposure(data);
      }
      if (connectionCtx.gain === undefined) {
        let data = fetchGainDB();
        if (data !== undefined) connectionCtx.setGain(data);
      }
      if (connectionCtx.IR === undefined) {
        let data = fetchIRDB();
        if (data !== undefined) connectionCtx.setIR(data);
      }
      if (connectionCtx.fileFormat === undefined) {
        let data = fetchFileFormatDB();
        if (data !== undefined) connectionCtx.setFileFormat(data);
      }
    }

    return () => {
      console.log("unmount: delete checkConnectionLoop timer");
      clearInterval(timer);
    };
  }, [connectionCtx]);
}
