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

  let showInstructions =
    connectionCtx.currentObjectListName === "default" ||
    connectionCtx.currentObjectListName === undefined;

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
      {showInstructions && (
        <>
          <p className="mt-4">Please select an objects list.</p>

          <ol>
            <li>
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
            </li>
            <li>
              The Planets and Moon list has the planets in our solar system and
              the Moon. Be aware, Dwarf II is not good for taking images of the
              planets.
            </li>
          </ol>
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
