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
      {connectionCtx.currentObservationListName === "default" && (
        <>
          <p className="mt-4">Please select an observation list.</p>
          <p>
            The &quot;Center&quot; button will connect to Stellarium, and show
            the selected object in Stellarium. The &quot;Goto&quot; button will
            connect to the Dwarf II, and move the scope to the selected object.
          </p>
          <p>
            The DSO list has objects that are:
            <ul>
              <li>
                Large (&gt; 15 arcminutes) and relatively bright (under 10
                magnitude).
              </li>
              <li>Large (&gt; 15 arcminutes) and unknown brightness.</li>
              <li>
                Small (&lt; 15 arcminutes), relatively bright (under 10
                magnitude), with common names.
              </li>
              <li>50 of the brightest stars with common names.</li>
            </ul>
          </p>
          <p>
            The Planets and Moon list has the planets in our solar system and
            the Moon.
          </p>
        </>
      )}
      {connectionCtx.currentObservationListName === "dso" && (
        <DSOList objects={dsoObject}></DSOList>
      )}
      {connectionCtx.currentObservationListName === "planets" && (
        <PlanetsList></PlanetsList>
      )}
    </div>
  );
}
