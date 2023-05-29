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

export default function AutoGoto() {
  const [allObjects, setAllObjects] = useState(dwarflabObjects);
  const [objects, setObjects] = useState(dwarflabObjects);
  const [selectedTypes, setSelectedTypes] = useState(["all"]);
  const [objectList, setObjectList] = useState("");

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
    console.log(e.target.value);
    setObjectList(e.target.value);
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
      <h2>AutoGoto</h2>
      {JSON.stringify(selectedTypes)}

      <select
        className="form-select"
        value={objectList}
        onChange={selectListHandler}
      >
        <option>Select object lists</option>
        <option value="dwarflab">Dwarf Lab&apos;s list (49 objects)</option>
        <option value="michaelc">
          Michael Camilleri&apos;s list (169 objects)
        </option>
      </select>

      <ul>
        <li onClick={() => selectTypeHandler("all")}>All</li>
        <li onClick={() => selectTypeHandler("clusters")}>Clusters</li>
        <li onClick={() => selectTypeHandler("galaxies")}>Galaxies</li>
        <li onClick={() => selectTypeHandler("nebulae")}>Nebulae</li>
        <li onClick={() => selectTypeHandler("solar_system")}>Solar System</li>
        <li onClick={() => selectTypeHandler("stars")}>Stars</li>
      </ul>

      {objects.length}

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
