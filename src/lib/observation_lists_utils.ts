import {
  StellariumObservationObject,
  ObservationObject,
  ObservationObjectOpenNGC,
} from "@/types";
import { formatObjectNameStellarium, catalogs } from "@/lib/stellarium_utils";
import { typesTypesCategories } from "../../data/objectTypes";
import { abbrevNameConstellations } from "../../data/constellations";

function formatObservationStellarium(
  object: StellariumObservationObject
): ObservationObject {
  let data = {
    dec: object.dec,
    designation: object.designation,
    magnitude: object.magnitude,
    type: object.objtype,
    typeCategory:
      typesTypesCategories[object.objtype as keyof typeof typesTypesCategories],
    ra: object.ra,
    displayName: formatObjectNameStellarium(object),
    constellation:
      abbrevNameConstellations[
        object.constellation as keyof typeof abbrevNameConstellations
      ],
  } as ObservationObject;

  if (object.designation) {
    let parts = object.designation.split(" ");
    if (catalogs.includes(parts[0]) && parts.length === 2) {
      data.catalogue = parts[0];
      data.objectNumber = Number(parts[1]);
    } else {
      data.catalogue = object.designation;
      data.objectNumber = -1;
    }
  }
  return data;
}

export function processObservationListStellarium(
  objects: StellariumObservationObject[]
): ObservationObject[] {
  let formattedObjects = objects.map(formatObservationStellarium);
  let noCatalogObjects = formattedObjects
    .filter((obj) => obj.objectNumber == -1)
    .sort((a, b) => a.catalogue.localeCompare(b.catalogue));
  let catalogObjects = formattedObjects
    .filter((obj) => obj.objectNumber !== -1)
    .sort((a, b) => {
      return (
        a.catalogue.localeCompare(b.catalogue) ||
        a.objectNumber - b.objectNumber
      );
    });

  return noCatalogObjects.concat(catalogObjects);
}

export function processObservationListOpenNGC(
  observations: ObservationObjectOpenNGC[]
) {
  return observations.map(formatObservationOpenNGC);
}

function formatObservationOpenNGC(
  observation: ObservationObjectOpenNGC
): ObservationObject {
  return {
    dec: observation.Declination,
    designation: observation["Catalogue Entry"],
    magnitude: observation.Magnitude,
    type: observation.Type,
    typeCategory: observation["Type Category"],
    ra: observation["Right Ascension"],
    displayName: formatObjectNameOpenNGC(observation),
    catalogue: observation["Name catalog"],
    objectNumber: observation["Name number"],
    constellation: observation.Constellation,
    size: formatObjectSizeOpenNGC(observation),
  };
}

function formatObjectSizeOpenNGC(observation: ObservationObjectOpenNGC) {
  let sizes = [];
  if (observation["Height (')"] || observation["Width (')"]) {
    if (observation["Height (')"]) {
      sizes.push(observation["Height (')"] + "'");
    }
    if (observation["Width (')"]) {
      sizes.push(observation["Width (')"] + "'");
    }
  } else {
    if (observation["Major Axis"]) {
      sizes.push(observation["Major Axis"] + "'");
    }
    if (observation["Minor Axis"]) {
      sizes.push(observation["Minor Axis"] + "'");
    }
  }

  return sizes.join("x");
}

function formatObjectNameOpenNGC(observation: ObservationObjectOpenNGC) {
  let name = observation["Alternative Entries"];
  if (observation["Familiar Name"]) {
    name += ` - ${observation["Familiar Name"]}`;
  }
  return name;
}
