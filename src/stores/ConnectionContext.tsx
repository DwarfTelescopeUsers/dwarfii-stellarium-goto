import { createContext, useState } from "react";
import type { ReactNode } from "react";

import { ConnectionContextType, AstroSettings } from "@/types";

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

  const [connectionStatusStellarium, setConnectionStatusStellarium] = useState<
    boolean | undefined
  >();
  const [IPStellarium, setIPStellarium] = useState<string | undefined>();
  const [portStellarium, setPortStellarium] = useState<number | undefined>();
  const [urlStellarium, setUrlStellarium] = useState<string | undefined>();

  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();

  const [currentObservationListName, setCurrentObservationListName] = useState<
    string | undefined
  >();
  const [currentUserObservationListName, setUserCurrentObservationListName] =
    useState<string | undefined>();
  const [astroSettings, setAstroSettings] = useState<AstroSettings>(
    {} as AstroSettings
  );

  const [logger, setLogger] = useState<{ [k: string]: any }[] | undefined>();
  const [debug, setDebug] = useState<boolean | undefined>();

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

    currentObservationListName,
    setCurrentObservationListName,
    currentUserObservationListName,
    setUserCurrentObservationListName,

    astroSettings,
    setAstroSettings,
    deleteConnection,

    logger,
    setLogger,
    debug,
    setDebug,
  };
  return (
    <ConnectionContext.Provider value={context}>
      {children}
    </ConnectionContext.Provider>
  );
}

export default ConnectionContext;
