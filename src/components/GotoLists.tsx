import { useContext } from "react";
import type { ChangeEvent } from "react";

import DSOList from "@/components/astroObjects/DSOList";
import PlanetsList from "@/components/astroObjects/PlanetsList";
import dsoCatalog from "../../data/catalogs/dso_catalog.json";
import { processObjectListOpenNGC } from "@/lib/observation_lists_utils";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { saveCurrentObjectListNameDb } from "@/db/db_utils";

export default function AutoGoto() {
  let connectionCtx = useContext(ConnectionContext);
  let dsoObject = processObjectListOpenNGC(dsoCatalog);

  function selectListHandler(e: ChangeEvent<HTMLSelectElement>) {
    connectionCtx.setCurrentObjectListName(e.target.value);
    saveCurrentObjectListNameDb(e.target.value);
  }

  return (
    <div>
      {!connectionCtx.connectionStatusStellarium && (
        <p className="text-danger">
          You must connect to Stellarium for Center to work.
        </p>
      )}
      {!connectionCtx.connectionStatus && (
        <p className="text-danger">
          You must connect to Dwarf II for Goto to work.
        </p>
      )}

      <select
        className="form-select"
        value={connectionCtx.currentObjectListName || "default"}
        onChange={selectListHandler}
      >
        <option value="default">Select object lists</option>
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
          <p>The DSO list has objects that are:</p>
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
          <p>
            The Planets and Moon list has the planets in our solar system and
            the Moon.
          </p>
        </>
      )}
      {connectionCtx.currentObjectListName === "dso" && (
        <DSOList objects={dsoObject}></DSOList>
      )}
      {connectionCtx.currentObjectListName === "planets" && (
        <PlanetsList></PlanetsList>
      )}
    </div>
  );
}
