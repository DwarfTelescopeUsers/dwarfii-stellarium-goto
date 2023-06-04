import {
  ParsedStellariumData,
  StellariumObjectInfo,
  StellariumObservationObject,
  ObservationObject,
} from "@/types";

export let statusPath = "/api/main/status";
export let focusPath = "/api/main/focus?target=";
export let objectInfoPath = "/api/objects/info?format=json";

let catalogs = ["C", "Ced", "HIP", "IC", "LBN", "M", "NGC", "PGC"];

export let typesObjectTypes = {
  clusters: [
    "cluster associated with nebulosity",
    "open star cluster",
    "globular star cluster",
    "star cluster",
    "custom object",
  ],
  galaxies: ["galaxy", "active galaxy"],
  nebulae: [
    "bipolar nebula",
    "supernova remnant",
    "HII region",
    "planetary nebula",
    "emission nebula",
    "interstellar matter",
    "dark nebula",
    "reflection nebula",
    "stellar association",
  ],
  stars: ["double star, pulsating variable star", "double star"],
  solar_system: ["moon", "planet"],
};

export function parseStellariumData(text: string): ParsedStellariumData {
  let data = {} as ParsedStellariumData;

  const RADecData = parseRADec(text);
  if (RADecData) {
    data.RA = RADecData.RA;
    data.declination = RADecData.declination;
  }
  const nameData = parseObjectName(text);
  if (nameData) {
    data.objectName = nameData.objectName;
  }

  return data;
}

function parseRADec(text: string) {
  let matches = text.match(
    /RA\/Dec \(on date\): *([-0-9hms.+°]+)\/([-0-9.+°'"]+)/
  );
  if (matches) {
    return { RA: matches[1], declination: matches[2] };
  }
}

function parseObjectName(text: string) {
  let matches = text.match(/<h2>(.*?)<\/h2>/);
  if (matches) {
    return { objectName: matches[1].split("<br")[0] };
  }
}

export function formatObjectName(objectData: StellariumObjectInfo) {
  let allNames = new Set([
    objectData.designations,
    objectData.name,
    objectData["localized-name"],
  ]);

  let names = objectData.designations;
  if (objectData.designations !== objectData.name) {
    names += `: ${objectData.name}`;
  }
  if (objectData.name !== objectData["localized-name"]) {
    if (allNames.size === 3) {
      names += `; ${objectData["localized-name"]}`;
    } else {
      names += `: ${objectData["localized-name"]}`;
    }
  }

  return names;
}

export function formatObsevationObjectName(
  objectData: StellariumObservationObject
) {
  const { designation, name, nameI18n } = objectData;
  let allNames = new Set([designation, name, nameI18n]);

  let names = designation;
  if (designation !== name && name !== "") {
    names += ` - ${name}`;
  }
  if (name !== nameI18n && nameI18n !== "") {
    if (allNames.size === 3) {
      names += `; ${nameI18n}`;
    } else {
      names += ` - ${nameI18n}`;
    }
  }

  return names;
}

// https://stackoverflow.com/a/24457420
export function isNumeric(value: string) {
  return /^-?\d+$/.test(value);
}

function formatObservation(
  object: StellariumObservationObject
): ObservationObject {
  let data = {
    dec: object.dec,
    designation: object.designation,
    magnitude: object.magnitude,
    objtype: object.objtype,
    ra: object.ra,
    displayName: formatObsevationObjectName(object),
  } as ObservationObject;

  let parts = object.designation.split(" ");
  if (catalogs.includes(parts[0]) && parts.length === 2) {
    data.sortName1 = parts[0];
    data.sortName2 = Number(parts[1]);
  } else {
    data.sortName1 = object.designation;
    data.sortName2 = -1;
  }
  return data;
}

export function processObservationList(
  objects: StellariumObservationObject[]
): ObservationObject[] {
  let formattedObjects = objects.map(formatObservation);
  let noCatalogObjects = formattedObjects
    .filter((obj) => obj.sortName2 == -1)
    .sort((a, b) => a.sortName1.localeCompare(b.sortName1));
  let catalogObjects = formattedObjects
    .filter((obj) => obj.sortName2 !== -1)
    .sort((a, b) => {
      return (
        a.sortName1.localeCompare(b.sortName1) || a.sortName2 - b.sortName2
      );
    });

  return noCatalogObjects.concat(catalogObjects);
}
