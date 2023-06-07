import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";

import dwarflabObservationList from "../../../data/observingList_DwarfII.json";
import mikeObservationList from "../../../data/observingList_mike_camilleri.json";

import { AstronomyObjectTypes, ObservationObject } from "@/types";
import {
  typesObjectTypes,
  processObservationList,
} from "@/lib/stellarium_utils";
import AstronomyObject from "./AstronomyObject";
import { pluralize } from "@/lib/text_utils";

let dwarflabObjects: ObservationObject[] = processObservationList(
  dwarflabObservationList.observingLists.observingLists[
    "{5e727f81-e0a8-43f0-9258-3848aa2d9762}"
  ].objects
);

let mikeObjects: ObservationObject[] = processObservationList(
  mikeObservationList.observingLists.observingLists[
    "{998bdf5f-82af-433c-bf65-619969e85574}"
  ].objects
);

let objectTypesMenu = [
  { value: "all", label: "All" },
  { value: "clusters", label: "Clusters" },
  { value: "galaxies", label: "Galaxies" },
  { value: "nebulae", label: "Nebulae" },
  { value: "solar_system", label: "Solar System" },
  { value: "stars", label: "Stars" },
];

let observationListsMenu = {
  dwarflab: {
    description: "List of objects from Dwarf mobile app. 49 objects.",
  },
  michaelc: {
    description:
      "Michael Camilleri's list of objects ~18' or larger. 169 objects. ",
  },
};

export default function AutoGoto() {
  const [allObjects, setAllObjects] = useState(dwarflabObjects);
  const [objects, setObjects] = useState(dwarflabObjects);
  const [selectedTypes, setSelectedTypes] = useState(["all"]);
  const [objectList, setObjectList] =
    useState<keyof typeof observationListsMenu>("dwarflab");

  useEffect(() => {
    filterObjects();
  }, [selectedTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectTypeHandler(targetType: string) {
    if (targetType === "all") {
      setSelectedTypes(["all"]);
      // remove type
    } else if (selectedTypes.includes(targetType)) {
      if (selectedTypes.length === 1) {
        setSelectedTypes(["all"]);
      } else {
        setSelectedTypes(selectedTypes.filter((type) => type !== targetType));
      }
      // add type
    } else {
      setSelectedTypes((prev) =>
        prev.filter((type) => type !== "all").concat([targetType])
      );
    }
  }

  function filterObjects() {
    let filteredObjectTypes: string[] = [];
    selectedTypes.forEach((type) => {
      filteredObjectTypes = filteredObjectTypes.concat(
        typesObjectTypes[type as AstronomyObjectTypes]
      );
    });

    if (selectedTypes.includes("all")) {
      setObjects(allObjects);
    } else {
      setObjects(
        allObjects.filter((object) => {
          return filteredObjectTypes.includes(object.objtype);
        })
      );
    }
  }

  function selectListHandler(e: ChangeEvent<HTMLSelectElement>) {
    let listName = e.target.value as keyof typeof observationListsMenu;
    setObjectList(listName);
    if (e.target.value === "dwarflab") {
      setAllObjects(dwarflabObjects);
      setObjects(dwarflabObjects);
    } else {
      setAllObjects(mikeObjects);
      setObjects(mikeObjects);
    }
  }

  return (
    <div>
      <h2>Observations Lists</h2>
      <select
        className="form-select"
        value={objectList}
        onChange={selectListHandler}
      >
        <option>Select object lists</option>
        <option value="dwarflab">Dwarf Lab&apos;s list</option>
        <option value="michaelc">List of objects ~18&apos; or larger.</option>
      </select>
      <p className="mt-3">{observationListsMenu[objectList]?.description}</p>

      <ul className="nav nav-pills mt-3">
        {objectTypesMenu.map((type) => (
          <li
            key={type.value}
            className={`nav-item nav-link rounded-pill ${
              selectedTypes.includes(type.value) ? "active" : ""
            }`}
            onClick={() => selectTypeHandler(type.value)}
          >
            {type.label}
          </li>
        ))}
      </ul>

      <h4 className="mt-3">
        {objects.length} {pluralize(objects.length, "Object", "Objects")}
      </h4>

      <table className="table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">info</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          {objects.map((object, i) => (
            <AstronomyObject key={i} object={object} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
