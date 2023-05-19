import React from "react";

export type ConnectionContextType = {
  connectionStatus: boolean | undefined;
  setConnectionStatus: React.Dispatch<
    React.SetStateAction<boolean | undefined>
  >;
  initialConnectionTime: number | undefined;
  setInitialConnectionTime: React.Dispatch<
    React.SetStateAction<number | undefined>
  >;

  connectionStatusStellarium: boolean | undefined;
  setConnectionStatusStellarium: React.Dispatch<
    React.SetStateAction<boolean | undefined>
  >;

  connectionStatusStellarium: boolean | undefined;
  setConnectionStatusStellarium: React.Dispatch<
    React.SetStateAction<boolean | undefined>
  >;
  IPStellarium: string | undefined;
  setIPStellarium: React.Dispatch<React.SetStateAction<string | undefined>>;
  portStellarium: number | undefined;
  setPortStellarium: React.Dispatch<React.SetStateAction<number | undefined>>;
  urlStellarium: string | undefined;
  setUrlStellarium: React.Dispatch<React.SetStateAction<string | undefined>>;

  latitude: number | undefined;
  setLatitude: React.Dispatch<React.SetStateAction<number | undefined>>;
  longitude: number | undefined;
  setLongitude: React.Dispatch<React.SetStateAction<number | undefined>>;

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

export type ParsedStellariumData = {
  objectName: string;
  RA: string;
  declination: string;
};
