import React, { createContext, useState } from "react";

import { ConnectionContextType } from "@/types";

type ProviderProps = {
  children: React.ReactNode;
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

    deleteConnection,
  };
  return (
    <ConnectionContext.Provider value={context}>
      {children}
    </ConnectionContext.Provider>
  );
}

export default ConnectionContext;
