import type { FormEvent, Dispatch, SetStateAction } from "react";
import Modal from "react-bootstrap/Modal";

import { ObservationObject } from "@/types";
import {
  saveObservationListsNamesDb,
  saveObservationListsDb,
} from "@/db/db_utils";

type PropTypes = {
  setCurrentObjectListName: Dispatch<SetStateAction<string>>;
  objectListsNames: string[];
  setObjectListsNames: Dispatch<SetStateAction<string[]>>;
  objectLists: { [k: string]: ObservationObject[] };
  setObjectLists: Dispatch<
    SetStateAction<{ [k: string]: ObservationObject[] }>
  >;
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  currentObjectListName: string;
};

export default function DeleteObservationListModal(props: PropTypes) {
  const {
    setCurrentObjectListName,
    objectListsNames,
    setObjectListsNames,
    objectLists,
    setObjectLists,
    showModal,
    setShowModal,
    currentObjectListName,
  } = props;

  function handleCloseModal() {
    setShowModal(false);
  }

  function deleteListHandler(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let updatedListsNames = objectListsNames.filter(
      (name) => name != currentObjectListName
    );
    setObjectListsNames(updatedListsNames);
    saveObservationListsNamesDb(updatedListsNames.join("|"));
    setCurrentObjectListName("");
    const cloneObjectLists = structuredClone(objectLists);
    delete cloneObjectLists[currentObjectListName];
    setObjectLists(cloneObjectLists);
    saveObservationListsDb(JSON.stringify(cloneObjectLists));

    // close modal
    setShowModal(false);
  }

  return (
    <Modal show={showModal} onHide={handleCloseModal}>
      <Modal.Header closeButton>
        <Modal.Title>Delete Observation List</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form onSubmit={deleteListHandler}>
          <p className="mb-3">
            Are you sure you want to delete {currentObjectListName}?
          </p>

          <button type="submit" className="btn btn-primary">
            Delete List
          </button>
        </form>
      </Modal.Body>
    </Modal>
  );
}
