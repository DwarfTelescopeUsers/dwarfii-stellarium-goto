import React, { useState } from "react";
import type { ChangeEvent } from "react";

import DSOList from "@/components/astroObjects/DSOList";
import PlanetsList from "@/components/astroObjects/PlanetsList";

export default function AutoGoto() {
  const [objectList, setObjectList] = useState("dso");

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

      {objectList === "dso" && <DSOList></DSOList>}
      {objectList === "planets" && <PlanetsList></PlanetsList>}
    </div>
  );
}
