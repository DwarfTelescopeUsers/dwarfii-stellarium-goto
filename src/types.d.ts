import React from "react";

export type ConnectionContextType = {
  binning: number | undefined;
  setBinning: React.Dispatch<React.SetStateAction<number | undefined>>;
  connectionStatus: boolean | undefined;
  setConnectionStatus: React.Dispatch<
    React.SetStateAction<boolean | undefined>
  >;
  declination: number | undefined;
  setDeclination: React.Dispatch<React.SetStateAction<number | undefined>>;
  exposure: number | undefined;
  setExposure: React.Dispatch<React.SetStateAction<number | undefined>>;
  exposureMode: number | undefined;
  setExposureMode: React.Dispatch<React.SetStateAction<number | undefined>>;
  fileFormat: number | undefined;
  setFileFormat: React.Dispatch<React.SetStateAction<number | undefined>>;
  gain: number | undefined;
  setGain: React.Dispatch<React.SetStateAction<number | undefined>>;
  gainMode: number | undefined;
  setGainMode: React.Dispatch<React.SetStateAction<number | undefined>>;
  initialConnectionTime: number | undefined;
  setInitialConnectionTime: React.Dispatch<
    React.SetStateAction<number | undefined>
  >;
  IR: number | undefined;
  setIR: React.Dispatch<React.SetStateAction<number | undefined>>;
  latitude: number | undefined;
  setLatitude: React.Dispatch<React.SetStateAction<number | undefined>>;
  longitude: number | undefined;
  setLongitude: React.Dispatch<React.SetStateAction<number | undefined>>;
  RA: number | undefined;
  setRA: React.Dispatch<React.SetStateAction<number | undefined>>;

  deleteSettings: () => void;
  deleteConnection: () => void;
};

export type CoordinatesData = {
  latitude?: number;
  longitude?: number;
};

export type RADeclinationData = {
  RA?: number;
  declination?: number;
};
