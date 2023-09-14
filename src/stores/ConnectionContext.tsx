import { createContext, useState } from "react";
import type { ReactNode } from "react";

import { ConnectionContextType, AstroSettings, ImagingSession } from "@/types";

type ProviderProps = {
  children: ReactNode;
};

export const ConnectionContext = createContext<ConnectionContextType>(
  {} as ConnectionContextType
);

export function ConnectionContextProvider({ children }: ProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<
    boolean | undefined
  >();
  const [initialConnectionTime, setInitialConnectionTime] = useState<
    number | undefined
  >();
  const [IPDwarf, setIPDwarf] = useState<string | undefined>();
  const [socketIPDwarf, setSocketIPDwarf] = useState<WebSocket | undefined>();

  const [connectionStatusStellarium, setConnectionStatusStellarium] = useState<
    boolean | undefined
  >();
  const [IPStellarium, setIPStellarium] = useState<string | undefined>();
  const [portStellarium, setPortStellarium] = useState<number | undefined>();
  const [urlStellarium, setUrlStellarium] = useState<string | undefined>();

  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [timezone, setTimezone] = useState<string | undefined>();

  const [searchTxt, setSearchTxt] = useState<string | undefined>("");

  const [currentObjectListName, setCurrentObjectListName] = useState<
    string | undefined
  >();
  const [currentUserObjectListName, setUserCurrentObjectListName] = useState<
    string | undefined
  >();
  const [astroSettings, setAstroSettings] = useState<AstroSettings>(
    {} as AstroSettings
  );
  const [imagingSession, setImagingSession] = useState<ImagingSession>(
    {} as ImagingSession
  );

  const [logger, setLogger] = useState<{ [k: string]: any }[] | undefined>();
  const [loggerStatus, setLoggerStatus] = useState<boolean | undefined>();

  function deleteConnection() {
    setConnectionStatus(undefined);
    setInitialConnectionTime(undefined);

    setConnectionStatusStellarium(undefined);
  }

  let context = {
    connectionStatus,
    setConnectionStatus,
    initialConnectionTime,
    setInitialConnectionTime,
    IPDwarf,
    setIPDwarf,
    socketIPDwarf,
    setSocketIPDwarf,

    connectionStatusStellarium,
    setConnectionStatusStellarium,
    IPStellarium,
    setIPStellarium,
    portStellarium,
    setPortStellarium,
    urlStellarium,
    setUrlStellarium,

    latitude,
    setLatitude,
    longitude,
    setLongitude,
    timezone,
    setTimezone,

    searchTxt,
    setSearchTxt,

    currentObjectListName,
    setCurrentObjectListName,
    currentUserObjectListName,
    setUserCurrentObjectListName,

    astroSettings,
    setAstroSettings,
    imagingSession,
    setImagingSession,

    deleteConnection,

    logger,
    setLogger,
    loggerStatus,
    setLoggerStatus,
  };
  return (
    <ConnectionContext.Provider value={context}>
      {children}
    </ConnectionContext.Provider>
  );
}

export default ConnectionContext;
