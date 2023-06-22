import type { FormEvent, Dispatch, SetStateAction } from "react";
import { useState, useContext } from "react";
import Papa from "papaparse";
import type { ChangeEvent } from "react";
import Modal from "react-bootstrap/Modal";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { processObservationListTelescopius } from "@/lib/observation_lists_utils";
import { ObservationObject, ObservationObjectTelescopius } from "@/types";
import {
  saveObservationListsDb,
  saveObservationListsNamesDb,
  saveUserCurrentObservationListNameDb,
} from "@/db/db_utils";

type PropTypes = {
  objectListsNames: string[];
  setObjectListsNames: Dispatch<SetStateAction<string[]>>;
  objectLists: { [k: string]: ObservationObject[] };
  setObjectLists: Dispatch<
    SetStateAction<{ [k: string]: ObservationObject[] }>
  >;
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
};
export default function ImportObservationListModal(props: PropTypes) {
  const {
    objectListsNames,
    setObjectListsNames,
    objectLists,
    setObjectLists,
    showModal,
    setShowModal,
  } = props;

  let connectionCtx = useContext(ConnectionContext);

  let [error, setError] = useState<string | undefined>();

  function handleCloseModal() {
    setShowModal(false);
  }

  function fileUploadHandler(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const formName = formData.get("list_name");
    if (formName === null) {
      setError("List name is required.");
      return;
    }
    let name = formName.toString();

    // handle list csv
    // https://stackoverflow.com/a/68597716
    const formFile = formData.get("upload") as File;
    formFile.text().then((data) => {
      const csvData = Papa.parse(data, { header: true });
      const cloneObjectLists = structuredClone(objectLists);
      cloneObjectLists[name] = processObservationListTelescopius(
        csvData.data as ObservationObjectTelescopius[]
      );
      saveObservationListsDb(JSON.stringify(cloneObjectLists));
      setObjectLists(cloneObjectLists);

      // handle list name
      let updatedListsNames = objectListsNames.concat(name).join("|");
      saveObservationListsNamesDb(updatedListsNames);
      setObjectListsNames(objectListsNames.concat(name));
      connectionCtx.setUserCurrentObservationListName(name);
      saveUserCurrentObservationListNameDb(name);

      // close modal
      setShowModal(false);
    });
  }

  function nameInputHandler(e: ChangeEvent<HTMLInputElement>) {
    setError("");
    if (objectListsNames.includes(e.currentTarget.value)) {
      setError(`There is a list already named "${e.currentTarget.value}".`);
    }
  }

  return (
    <Modal show={showModal} onHide={handleCloseModal}>
      <Modal.Header closeButton>
        <Modal.Title>Add Observation List</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p>Import observation list from Telescopius.</p>

        <form onSubmit={fileUploadHandler}>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">
              List Name
            </label>
            <input
              type="text"
              className="form-control"
              id="list_name"
              name="list_name"
              onChange={nameInputHandler}
              required
            />
            {error && <p className="text-danger">{error}</p>}
          </div>
          <div className="mb-3">
            <input
              type="file"
              name="upload"
              accept=".csv"
              className="form-control"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Import List
          </button>
        </form>
      </Modal.Body>
    </Modal>
  );
}
