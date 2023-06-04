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

export type AstronomyObjectTypes =
  | "clusters"
  | "galaxies"
  | "nebulae"
  | "stars"
  | "solar_system";

export type StellariumObservationObject = {
  constellation: string;
  dec: string;
  designation?: string;
  fov: number;
  isVisibleMarker: boolean;
  jd: number;
  landscapeID: string;
  location: string;
  magnitude: string;
  name?: string;
  nameI18n?: string;
  objtype: string;
  ra: string;
  type: string;
};

export type ObservationObject = {
  dec: string;
  designation: string;
  magnitude: string;
  objtype: string;
  ra: string;
  displayName: string;
  sortName1: string;
  sortName2: number;
};

export type StellariumObjectInfo = {
  "above-horizon": boolean;
  airmass: number;
  altitude: number;
  "altitude-geometric": number;
  ambientInt: number;
  ambientLum: number;
  appSidTm: string;
  azimuth: number;
  "azimuth-geometric": number;
  bmag: number;
  dec: number;
  decJ2000: number;
  designations: string;
  elat: number;
  elatJ2000: number;
  elong: number;
  elongJ2000: number;
  found: boolean;
  glat: number;
  glong: number;
  "hourAngle-dd": number;
  "hourAngle-hms": string;
  iauConstellation: string;
  "localized-name": string;
  meanSidTm: string;
  morpho: string;
  name: string;
  "object-type": string;
  parallacticAngle: number;
  ra: number;
  raJ2000: number;
  redshift: number;
  rise: string;
  "rise-dhr": number;
  set: string;
  "set-dhr": number;
  sglat: number;
  sglong: number;
  size: number;
  "size-dd": number;
  "size-deg": string;
  "size-dms": string;
  "surface-brightness": number;
  transit: string;
  "transit-dhr": number;
  type: string;
  vmag: number;
  vmage: number;
};
