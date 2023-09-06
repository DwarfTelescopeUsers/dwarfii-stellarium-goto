import { useContext, useEffect } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  fetchCoordinatesDB,
  fetchInitialConnectionTimeDB,
  fetchIPStellariumDB,
  fetchPortStellariumDB,
  fetchUrlStellariumDB,
  fetchConnectionStatusStellariumDB,
  fetchIPDwarfDB,
  fetchUserCurrentObjectListNameDb,
  fetchCurrentObjectListNameDb,
  fetchConnectionStatusDB,
  fetchAstroSettingsDb,
  fetchLoggerStatusDb,
  fetchLogMessagesDb,
  fetchImagingSessionDb,
  fetchTimezoneDB,
} from "@/db/db_utils";

export function useLoadIntialValues() {
  let connectionCtx = useContext(ConnectionContext);

  useEffect(() => {
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
    if (connectionCtx.timezone === undefined || connectionCtx.timezone == "?") {
      let data = fetchTimezoneDB();

      if (data == "" || data == "?")
        data = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (data) {
        connectionCtx.setTimezone(data);
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

    if (connectionCtx.searchTxt === undefined) {
      connectionCtx.setSearchTxt("Search");
    }

    if (connectionCtx.currentObjectListName === undefined) {
      let data = fetchCurrentObjectListNameDb();
      if (data !== undefined) {
        connectionCtx.setCurrentObjectListName(data);
      }
    }

    if (connectionCtx.currentUserObjectListName === undefined) {
      let data = fetchUserCurrentObjectListNameDb();
      if (data !== undefined) {
        connectionCtx.setUserCurrentObjectListName(data);
      }
    }

    if (connectionCtx.astroSettings.gain === undefined) {
      let data = fetchAstroSettingsDb();
      if (data !== undefined) {
        connectionCtx.setAstroSettings(data);
      }
    }

    if (connectionCtx.imagingSession.startTime === undefined) {
      let data = fetchImagingSessionDb();
      if (data !== undefined) {
        connectionCtx.setImagingSession(data);
      }
    }

    if (connectionCtx.loggerStatus === undefined) {
      let data = fetchLoggerStatusDb();
      if (data !== undefined) {
        connectionCtx.setLoggerStatus(data);
      }
    }

    if (connectionCtx.logger === undefined) {
      let data = fetchLogMessagesDb();
      if (data !== undefined) {
        connectionCtx.setLogger(data);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
