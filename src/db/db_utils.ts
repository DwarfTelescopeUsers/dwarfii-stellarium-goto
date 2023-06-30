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

export function saveIPDwarfDB(ip: string) {
  localStorage.setItem("IPDwarf", ip);
}

export function fetchIPDwarfDB(): string | undefined {
  let data = localStorage.getItem("IPDwarf");
  if (data) {
    return data;
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

export function saveObservationListsNamesDb(names: string) {
  localStorage.setItem("observationListsNames", names);
}

export function fetchObservationListsNamesDb(): string[] | undefined {
  let data = localStorage.getItem("observationListsNames");
  if (data) {
    let names = data.split("|");
    names.sort();
    return names;
  }
}

export function saveObservationListsDb(names: string) {
  localStorage.setItem("observationLists", names);
}

export function fetchObservationListsDb() {
  let data = localStorage.getItem("observationLists");
  if (data) {
    return JSON.parse(data);
  }
}

export function saveCurrentObservationListNameDb(name: string) {
  localStorage.setItem("currentObservationListName", name);
}

export function fetchCurrentObservationListNameDb() {
  let data = localStorage.getItem("currentObservationListName");
  if (data) {
    return data;
  }
}

export function saveUserCurrentObservationListNameDb(name: string) {
  localStorage.setItem("currentUserObservationListName", name);
}

export function fetchUserCurrentObservationListNameDb() {
  let data = localStorage.getItem("currentUserObservationListName");
  if (data) {
    return data;
  }
}

export function fetchAstroSettingsDb(key: string) {
  let data = localStorage.getItem("astroSettings");
  if (data) {
    let obj = JSON.parse(data);
    return obj[key];
  }
}

export function fetchAstroSettingsAllDb() {
  let data = localStorage.getItem("astroSettings");
  if (data) {
    return JSON.parse(data);
  }
}

export function saveAstroSettingsDb(key: string, value: string | undefined) {
  let data = localStorage.getItem("astroSettings");
  if (data) {
    let obj = JSON.parse(data);
    if (value === undefined) {
      delete obj[key];
    } else {
      obj[key] = value;
    }
    localStorage.setItem("astroSettings", JSON.stringify(obj));
  } else {
    let obj = { [key]: value };
    localStorage.setItem("astroSettings", JSON.stringify(obj));
  }
}

export function deleteConnectionDB(): void {
  [
    "connectionStatus",
    "initialConnectionTime",
    "connectionStatusStellarium",
  ].forEach((item) => localStorage.removeItem(item));
}

export function fetchDebugDb(): boolean | undefined {
  let data = localStorage.getItem("debug");
  if (data) {
    return data === "true" ? true : false;
  }
}

export function saveDebugDb(value: string): void {
  localStorage.setItem("debug", value);
}

export function fetchDebugMessagesDb() {
  let data = localStorage.getItem("debugMessages");
  if (data) {
    return JSON.parse(data);
  }
}

export function saveDebugMessagesDb(value: { [k: string]: any }): void {
  let data = fetchDebugMessagesDb();
  if (data) {
    data.push(value);
    localStorage.setItem("debugMessages", JSON.stringify(data));
  } else {
    localStorage.setItem("debugMessages", JSON.stringify([value]));
  }
}
