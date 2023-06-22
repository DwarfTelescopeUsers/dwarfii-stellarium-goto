import type { FormEvent, Dispatch, SetStateAction } from "react";
import Modal from "react-bootstrap/Modal";
import { useContext } from "react";

import { ObservationObject } from "@/types";
import {
  saveObservationListsNamesDb,
  saveObservationListsDb,
  saveUserCurrentObservationListNameDb,
} from "@/db/db_utils";
import { ConnectionContext } from "@/stores/ConnectionContext";

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

export default function DeleteObservationListModal(props: PropTypes) {
  const {
    objectListsNames,
    setObjectListsNames,
    objectLists,
    setObjectLists,
    showModal,
    setShowModal,
  } = props;

  let connectionCtx = useContext(ConnectionContext);

  function handleCloseModal() {
    setShowModal(false);
  }

  function deleteListHandler(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let updatedListsNames = objectListsNames.filter(
      (name) => name != connectionCtx.currentUserObservationListName
    );
    setObjectListsNames(updatedListsNames);
    saveObservationListsNamesDb(updatedListsNames.join("|"));

    const cloneObjectLists = structuredClone(objectLists);
    delete cloneObjectLists[
      connectionCtx.currentUserObservationListName as string
    ];
    setObjectLists(cloneObjectLists);
    saveObservationListsDb(JSON.stringify(cloneObjectLists));
    connectionCtx.setUserCurrentObservationListName(undefined);
    saveUserCurrentObservationListNameDb("default");

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
          <p className="mb-3">Are you sure you want to delete {}?</p>

          <button type="submit" className="btn btn-primary">
            Delete List
          </button>
        </form>
      </Modal.Body>
    </Modal>
  );
}
