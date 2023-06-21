// save current list in context store and database

import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";

import DSOList from "@/components/astroObjects/DSOList";
import ImportObservationListModal from "@/components/ImportObservationListModal";
import DeleteObservationListModal from "./DeleteObservationListModal";
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  function importListModalHandle() {
    setShowImportModal(true);
  }

  function deleteListModalHandle() {
    setShowDeleteModal(true);
  }

  return (
    <div>
      <h2>Custom Observations Lists</h2>
      <div className="row">
        <div className="col-md-8">
          <select
            className="form-select mb-2"
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

        <div className="col-md-4">
          <button
            className="btn btn-outline-secondary me-2 mb-2"
            onClick={importListModalHandle}
          >
            Add new list
          </button>
          <button
            className="btn btn-outline-secondary  mb-2"
            onClick={deleteListModalHandle}
          >
            Delete list
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
      <ImportObservationListModal
        showModal={showImportModal}
        setShowModal={setShowImportModal}
        setCurrentObjectListName={setCurrentObjectListName}
        objectListsNames={objectListsNames}
        setObjectListsNames={setObjectListsNames}
        objectLists={objectLists}
        setObjectLists={setObjectLists}
      />
      <DeleteObservationListModal
        currentObjectListName={currentObjectListName}
        showModal={showDeleteModal}
        setShowModal={setShowDeleteModal}
        setCurrentObjectListName={setCurrentObjectListName}
        objectListsNames={objectListsNames}
        setObjectListsNames={setObjectListsNames}
        objectLists={objectLists}
        setObjectLists={setObjectLists}
      />
    </div>
  );
}
