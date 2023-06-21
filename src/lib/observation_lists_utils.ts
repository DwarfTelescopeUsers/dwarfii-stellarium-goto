import {
  StellariumObservationObject,
  ObservationObject,
  ObservationObjectOpenNGC,
  ObservationObjectTelescopius,
} from "@/types";
import { formatObjectNameStellarium, catalogs } from "@/lib/stellarium_utils";
import { typesTypesCategories } from "../../data/objectTypes";
import { abbrevNameConstellations } from "../../data/constellations";

function formatObservationStellarium(
  observation: StellariumObservationObject
): ObservationObject {
  let data = {
    dec: observation.dec,
    designation: observation.designation,
    magnitude: observation.magnitude,
    type: observation.objtype,
    typeCategory:
      typesTypesCategories[
        observation.objtype as keyof typeof typesTypesCategories
      ],
    ra: observation.ra,
    displayName: formatObjectNameStellarium(observation),
    alternateNames: "",
    constellation:
      abbrevNameConstellations[
        observation.constellation as keyof typeof abbrevNameConstellations
      ],
  } as ObservationObject;

  if (observation.designation) {
    let parts = observation.designation.split(" ");
    if (catalogs.includes(parts[0]) && parts.length === 2) {
      data.catalogue = parts[0];
      data.objectNumber = Number(parts[1]);
    } else {
      data.catalogue = observation.designation;
      data.objectNumber = -1;
    }
  }
  return data;
}

export function processObservationListStellarium(
  observations: StellariumObservationObject[]
): ObservationObject[] {
  let formattedObjects = observations.map(formatObservationStellarium);
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
  return observations
    .map((observation) => {
      return {
        dec: observation.Declination,
        designation: observation["Catalogue Entry"],
        magnitude: observation.Magnitude,
        type: observation.Type,
        typeCategory: observation["Type Category"],
        ra: observation["Right Ascension"],
        displayName: formatObjectNameOpenNGC(observation),
        alternateNames: observation["Alternative Entries"],
        catalogue: observation["Name catalog"],
        objectNumber: observation["Name number"],
        constellation: observation.Constellation,
        size: formatObjectSizeOpenNGC(observation),
      };
    })
    .sort((a, b) => {
      return (
        a.catalogue.localeCompare(b.catalogue) ||
        a.objectNumber - b.objectNumber
      );
    });
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
  let name = observation["Catalogue Entry"];
  if (observation["Familiar Name"]) {
    name += ` - ${observation["Familiar Name"]}`;
  }
  return name;
}

export function processObservationListTelescopius(
  observations: ObservationObjectTelescopius[]
) {
  return observations
    .filter((observation) => observation["Catalogue Entry"])
    .map((observation, index) => {
      let data = {
        dec: observation.Declination,
        designation: observation["Catalogue Entry"],
        magnitude: observation.Magnitude,
        type: observation.Type,
        typeCategory:
          typesTypesCategories[
            observation.Type as keyof typeof typesTypesCategories
          ],
        ra: observation["Right Ascension"],
        displayName: formatObjectNameTelescopius(observation),
        alternateNames: observation["Alternative Entries"],
        constellation: observation.Constellation,
        size: observation.Size,
      } as ObservationObject;

      let parts = observation["Catalogue Entry"].split(" ");
      if (parts.length > 1) {
        data.catalogue = parts[0];
        data.objectNumber = Number(parts[1]);
      } else {
        data.catalogue = observation["Catalogue Entry"];
        data.objectNumber = index;
      }
      return data;
    })
    .sort((a, b) => {
      return (
        a.catalogue.localeCompare(b.catalogue) ||
        a.objectNumber - b.objectNumber
      );
    });
}

function formatObjectNameTelescopius(
  observation: ObservationObjectTelescopius
) {
  let name = observation["Catalogue Entry"];
  if (observation["Familiar Name"]) {
    name += ` - ${observation["Familiar Name"]}`;
  }
  return name;
}
