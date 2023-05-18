import { CoordinatesData } from "@/types";

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

}

  }
}

}

}

}

}

}

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
