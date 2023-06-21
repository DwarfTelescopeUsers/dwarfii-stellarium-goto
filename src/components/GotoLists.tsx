import React, { useState } from "react";
import type { ChangeEvent } from "react";

import DSOList from "@/components/astroObjects/DSOList";
import PlanetsList from "@/components/astroObjects/PlanetsList";
import dsoCatalog from "../../data/catalogs/dso_catalog.json";
import { processObservationListOpenNGC } from "@/lib/observation_lists_utils";

export default function AutoGoto() {
  const [objectList, setObjectList] = useState("dso");
  let dsoObject = processObservationListOpenNGC(dsoCatalog);

  function selectListHandler(e: ChangeEvent<HTMLSelectElement>) {
    setObjectList(e.target.value);
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
        <option value="dso">DSO</option>
        <option value="planets">Planets and Moon</option>
      </select>
      {objectList === "dso" && <DSOList objects={dsoObject}></DSOList>}
      {objectList === "planets" && <PlanetsList></PlanetsList>}
    </div>
  );
}
