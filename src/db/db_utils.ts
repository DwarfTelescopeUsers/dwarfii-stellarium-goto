import { olderThanHours } from "@/lib/math_utils";
import { CoordinatesData, RADeclinationData } from "@/types";

export function saveCoordinatesDB(latitude: number, longitude: number) {
  localStorage.setItem("latitude", latitude.toString());
  localStorage.setItem("longitude", longitude.toString());
}

export function fetchCoordinatesDB(): CoordinatesData {
  let lat = localStorage.getItem("latitude");
  let lon = localStorage.getItem("longitude");
  if (typeof lat === "string" && typeof lon === "string") {
    return { latitude: Number(lat), longitude: Number(lon) };
  } else {
    return {};
  }
}

export function saveConnectionStatusDB(status: boolean) {
  localStorage.setItem("connectionStatus", status ? "true" : "false");
}

export function fetchConnectionStatusDB(): boolean | undefined {
  let status = localStorage.getItem("connectionStatus");
  if (status) {
    return status === "true";
  }
}

export function saveInitialConnectionTimeDB() {
  localStorage.setItem("initialConnectionTime", Date.now().toString());
}

export function fetchInitialConnectionTimeDB(): number | undefined {
  let time = localStorage.getItem("initialConnectionTime");
  if (time) {
    return Number(time);
  }
}

export function saveRADecDB(RA: number, declination: number): void {
  localStorage.setItem("RA", RA.toString());
  localStorage.setItem("declination", declination.toString());
}

export function fetchRADecDB(): RADeclinationData {
  let RA = localStorage.getItem("RA");
  let dec = localStorage.getItem("declination");
  if (typeof RA === "string" && typeof dec === "string") {
    return { RA: Number(RA), declination: Number(dec) };
  } else {
    return {};
  }
}

export function saveRADB(RA: number): void {
  localStorage.setItem("RA", RA.toString());
}

export function saveDecDB(declination: number): void {
  localStorage.setItem("declination", declination.toString());
}

export function saveBinningDB(value: number): void {
  localStorage.setItem("binning", value.toString());
}

export function fetchBinningDB(): number | undefined {
  let data = localStorage.getItem("binning");
  if (data) return Number(data);
}

export function saveExposureDB(value: number): void {
  localStorage.setItem("exposure", value.toString());
}

export function fetchExposureDB(): number | undefined {
  let data = localStorage.getItem("exposure");
  if (data) return Number(data);
}

export function saveExposureModeDB(value: number): void {
  localStorage.setItem("exposureMode", value.toString());
}

export function fetchExposureModeDB(): number | undefined {
  let data = localStorage.getItem("exposureMode");
  if (data) return Number(data);
}

export function saveFileFormatDB(value: number): void {
  localStorage.setItem("fileFormat", value.toString());
}

export function fetchFileFormatDB(): number | undefined {
  let data = localStorage.getItem("fileFormat");
  if (data) return Number(data);
}

export function saveGainDB(value: number): void {
  localStorage.setItem("gain", value.toString());
}

export function fetchGainDB(): number | undefined {
  let data = localStorage.getItem("gain");
  if (data) return Number(data);
}

export function saveGainModeDB(value: number): void {
  localStorage.setItem("gainMode", value.toString());
}

export function fetchGainModeDB(): number | undefined {
  let data = localStorage.getItem("gainMode");
  if (data) return Number(data);
}

export function saveIRDB(value: number): void {
  localStorage.setItem("IR", value.toString());
}

export function fetchIRDB(): number | undefined {
  let data = localStorage.getItem("IR");
  if (data) return Number(data);
}

export function expiredSession(): boolean | undefined {
  let prevTime = localStorage.getItem("initialConnectionTime");
  if (prevTime) {
    return olderThanHours(Number(prevTime), 12);
  }
}

export function deleteSettings(): void {
  [
    "connectionStatus",
    "initialConnectionTime",

    "latitude",
    "longitude",
    "RA",
    "declination",

    "gain",
    "exposure",
    "IR",
    "binning",

    "fileFormat",
  ].forEach((item) => localStorage.removeItem(item));
}

export function deleteConnectionDB(): void {
  [
    "connectionStatus",
    "initialConnectionTime",

    "RA",
    "declination",

    "gain",
    "gainMode",
    "exposure",
    "exposureMode",
    "IR",
    "binning",

    "fileFormat",
  ].forEach((item) => localStorage.removeItem(item));
}
