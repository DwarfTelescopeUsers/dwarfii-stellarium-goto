import React, { createContext, useState } from "react";

import { ConnectionContextType } from "@/types";

type ProviderProps = {
  children: React.ReactNode;
};

export const ConnectionContext = createContext<ConnectionContextType>(
  {} as ConnectionContextType
);

export function ConnectionContextProvider({ children }: ProviderProps) {
  const [binning, setBinning] = useState<number | undefined>();
  const [connectionStatus, setConnectionStatus] = useState<
    boolean | undefined
  >();
  const [declination, setDeclination] = useState<number | undefined>();
  const [exposure, setExposure] = useState<number | undefined>();
  const [exposureMode, setExposureMode] = useState<number | undefined>();
  const [fileFormat, setFileFormat] = useState<number | undefined>();
  const [gain, setGain] = useState<number | undefined>();
  const [gainMode, setGainMode] = useState<number | undefined>();
  const [initialConnectionTime, setInitialConnectionTime] = useState<
    number | undefined
  >();
  const [IR, setIR] = useState<number | undefined>();
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [RA, setRA] = useState<number | undefined>();

  function deleteSettings() {
    setConnectionStatus(undefined);
    setInitialConnectionTime(undefined);

    setLatitude(undefined);
    setLongitude(undefined);
    setRA(undefined);
    setDeclination(undefined);

    setGain(undefined);
    setGainMode(undefined);
    setExposure(undefined);
    setExposureMode(undefined);
    setIR(undefined);
    setBinning(undefined);

    setFileFormat(undefined);
  }

  function deleteConnection() {
    setConnectionStatus(undefined);
    setInitialConnectionTime(undefined);

    setRA(undefined);
    setDeclination(undefined);

    setGain(undefined);
    setGainMode(undefined);
    setExposure(undefined);
    setExposureMode(undefined);
    setIR(undefined);
    setBinning(undefined);

    setFileFormat(undefined);
  }

  let context = {
    binning,
    setBinning,
    connectionStatus,
    setConnectionStatus,
    declination,
    setDeclination,
    exposure,
    setExposure,
    exposureMode,
    setExposureMode,
    fileFormat,
    setFileFormat,
    gain,
    setGain,
    gainMode,
    setGainMode,
    initialConnectionTime,
    setInitialConnectionTime,
    IR,
    setIR,
    latitude,
    setLatitude,
    longitude,
    setLongitude,
    RA,
    setRA,

    deleteSettings,
    deleteConnection,
  };
  return (
    <ConnectionContext.Provider value={context}>
      {children}
    </ConnectionContext.Provider>
  );
}

export default ConnectionContext;
