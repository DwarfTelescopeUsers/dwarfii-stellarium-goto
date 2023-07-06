import type { Dispatch, SetStateAction } from "react";

export type ConnectionContextType = {
  connectionStatus: boolean | undefined;
  setConnectionStatus: Dispatch<SetStateAction<boolean | undefined>>;
  initialConnectionTime: number | undefined;
  setInitialConnectionTime: Dispatch<SetStateAction<number | undefined>>;

  connectionStatusStellarium: boolean | undefined;
  setConnectionStatusStellarium: Dispatch<SetStateAction<boolean | undefined>>;
  IPDwarf: string | undefined;
  setIPDwarf: Dispatch<SetStateAction<string | undefined>>;

  connectionStatusStellarium: boolean | undefined;
  setConnectionStatusStellarium: Dispatch<SetStateAction<boolean | undefined>>;
  IPStellarium: string | undefined;
  setIPStellarium: Dispatch<SetStateAction<string | undefined>>;
  portStellarium: number | undefined;
  setPortStellarium: Dispatch<SetStateAction<number | undefined>>;
  urlStellarium: string | undefined;
  setUrlStellarium: Dispatch<SetStateAction<string | undefined>>;

  latitude: number | undefined;
  setLatitude: Dispatch<SetStateAction<number | undefined>>;
  longitude: number | undefined;
  setLongitude: Dispatch<SetStateAction<number | undefined>>;

  currentObjectListName: string | undefined;
  setCurrentObjectListName: Dispatch<SetStateAction<string | undefined>>;
  currentUserObjectListName: string | undefined;
  setUserCurrentObjectListName: Dispatch<SetStateAction<string | undefined>>;

  astroSettings: AstroSettings;
  setAstroSettings: Dispatch<SetStateAction<AstroSettings>>;
  imagingSession: ImagingSession;
  setImagingSession: Dispatch<SetStateAction<ImagingSession>>;

  logger: { [k: string]: any }[] | undefined;
  setLogger: Dispatch<SetStateAction<{ [k: string]: any }[] | undefined>>;
  loggerStatus: boolean | undefined;
  setLoggerStatus: Dispatch<SetStateAction<boolean | undefined>>;

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

export type ObjectStellarium = {
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

export type AstroObject = {
  dec: string | null;
  designation: string;
  magnitude: string | null | number;
  type: string;
  typeCategory: string;
  ra: string | null;
  displayName: string;
  alternateNames: string | null;
  catalogue: string;
  objectNumber: number;
  size?: string;
  constellation: string | null | undefined;
};

export type ObjectStellariumInfo = {
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

export type ObjectOpenNGC = {
  "Catalogue Entry": string;
  "Alternative Entries": string | null;
  "Familiar Name": string | null;
  "Right Ascension": string | null;
  Declination: string | null;
  "Major Axis": number | null;
  "Minor Axis": number | null;
  Magnitude: number | null;
  "Name catalog": string;
  "Name number": number;
  Type: string;
  "Type Category": string;
  "Height (')": number | null;
  "Width (')": number | null;
  Constellation: string | null | undefined;
  Notes: string | null;
};

export type ObjectTelescopius = {
  "Alternative Entries": string;
  "Apparent Magnitude": string;
  "Catalogue Entry": string;
  Constellation: string;
  Declination: string;
  DEC: string;
  "Familiar Name": string;
  Magnitude: string;
  "Maximum Altitude": string;
  Name: string;
  Notes: string;
  "Orbit Type": string;
  "Position Angle (East)": string;
  RA: string;
  "Right Ascension": string;
  Size: string;
  "Surface Brightness": string;
  "Transit Time": string;
  Type: string;
  [k: string]: string;
};

export type AstroSettings = {
  rightAcension?: string;
  declination?: string;
  gain?: number | string;
  gainMode?: number;
  exposure?: number | string;
  exposureMode?: number;
  IR?: number;
  binning?: number;
  fileFormat?: number;
  count?: number;
};

type ImagingSession = {
  startTime: number;
  sessionElaspsedTime: string;
  imagesTaken: number;
};
