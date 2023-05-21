import { CoordinatesData } from "@/types";

export function saveCoordinatesDB(latitude: number, longitude: number) {
  localStorage.setItem("latitude", latitude.toString());
  localStorage.setItem("longitude", longitude.toString());
}

export function saveLatitudeDB(latitude: number) {
  localStorage.setItem("latitude", latitude.toString());
}

export function saveLongitudeDB(longitude: number) {
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

export function saveConnectionStatusStellariumDB(status: boolean) {
  localStorage.setItem("connectionStatusStellarium", status ? "true" : "false");
}

export function fetchConnectionStatusStellariumDB(): boolean | undefined {
  let status = localStorage.getItem("connectionStatusStellarium");
  if (status) {
    return status === "true";
  }
}

export function saveIPStellariumDB(ip: string) {
  localStorage.setItem("IPStellarium", ip);
}

export function fetchIPStellariumDB(): string | undefined {
  let data = localStorage.getItem("IPStellarium");
  if (data) {
    return data;
  }
}

export function savePortStellariumDB(port: number) {
  localStorage.setItem("portStellarium", port.toString());
}

export function fetchPortStellariumDB(): number | undefined {
  let data = localStorage.getItem("portStellarium");
  if (data) {
    return Number(data);
  }
}

export function saveUrlStellariumDB(url: string) {
  localStorage.setItem("urlStellarium", url);
}

export function fetchUrlStellariumDB(): string | undefined {
  let data = localStorage.getItem("urlStellarium");
  if (data) {
    return data;
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
    "connectionStatusStellarium",
  ].forEach((item) => localStorage.removeItem(item));
}
