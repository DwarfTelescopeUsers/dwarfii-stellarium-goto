import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";

import DSOList from "@/components/astroObjects/DSOList";
import ImportObservationList from "@/components/ImportObservationListModal";
import { ObservationObject } from "@/types";
import {
  fetchObservationListsDb,
  fetchObservationListsNamesDb,
} from "@/db/db_utils";

export default function AutoGoto() {
  const [currentObjectListName, setCurrentObjectListName] = useState("");
  let [objectListsNames, setObjectListsNames] = useState<string[]>([]);
  let [objectLists, setObjectLists] = useState<{
    [k: string]: ObservationObject[];
  }>({});
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // get observations lists from local storage on page load
    let names = fetchObservationListsNamesDb();
    if (names) {
      setObjectListsNames(names);
    }
    let lists = fetchObservationListsDb();
    if (lists) {
      setObjectLists(lists);
    }
  }, []);

  function selectListHandler(e: ChangeEvent<HTMLSelectElement>) {
    let listName = e.target.value;
    setCurrentObjectListName(listName);
  }

  let showInstructions = objectListsNames.length === 0;

  function handleShowModal() {
    setShowModal(true);
  }

  return (
    <div>
      <h2>Custom Observations Lists</h2>
      <div className="row">
        <div className="col-md-9">
          <select
            className="form-select"
            value={currentObjectListName}
            onChange={selectListHandler}
          >
            <option>Select object lists</option>
            {objectListsNames.map((list, index) => (
              <option key={index} value={list}>
                {list}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-3">
          <button
            className="btn btn-outline-secondary"
            onClick={handleShowModal}
          >
            Import list
          </button>
        </div>
      </div>

      {currentObjectListName && objectLists[currentObjectListName] && (
        <DSOList objects={objectLists[currentObjectListName]}></DSOList>
      )}

      {showInstructions && (
        <>
          <p className="mt-4 fs-5">
            To create custom observation lists, create an observation list at{" "}
            <a href="https://telescopius.com">Telescopius</a>, download the CSV,
            and click &quot;Add new list&quot;.
          </p>
          <p className="fs-5">
            The list will be saved to the browser&apos;s database and will only
            be accessible in this browser. No one else can access your lists.
          </p>
        </>
      )}
      <ImportObservationList
        showModal={showModal}
        setShowModal={setShowModal}
        setCurrentObjectListName={setCurrentObjectListName}
        objectListsNames={objectListsNames}
        setObjectListsNames={setObjectListsNames}
        objectLists={objectLists}
        setObjectLists={setObjectLists}
      />
    </div>
  );
}
