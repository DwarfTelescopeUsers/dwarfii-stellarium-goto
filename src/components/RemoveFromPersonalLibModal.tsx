import type { FormEvent, Dispatch, SetStateAction } from "react";
import Modal from "react-bootstrap/Modal";
import { useState, useEffect } from "react";

import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

import { AstroObject } from "@/types";
import { saveObjectListsByNameDb } from "@/db/db_utils";

type PropTypes = {
  objectName: string;
  objectPersonalList: AstroObject[];
  setObjectPersonalList: Dispatch<SetStateAction<AstroObject[]>>;
  setIsInPersonalList: Dispatch<SetStateAction<boolean>>;
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
};

export default function RemoveFromPersonalLibrary(props: PropTypes) {
  const {
    objectName,
    objectPersonalList,
    setObjectPersonalList,
    setIsInPersonalList,
    showModal,
    setShowModal,
  } = props;

  function handleCloseModal() {
    setShowModal(false);
  }

  function removeAstroObject(
    list: AstroObject[],
    nameToRemove: string,
  ): AstroObject[] {
    return list.filter((obj) => obj.displayName !== nameToRemove);
  }

  function removeObjectHandler(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    console.log("Before:", objectPersonalList);
    const updatedPersonalList = removeAstroObject(
      objectPersonalList,
      objectName,
    );
    console.log("After:", updatedPersonalList);
    saveObjectListsByNameDb("personal", JSON.stringify(updatedPersonalList));
    setObjectPersonalList(updatedPersonalList);
    setIsInPersonalList(false);

    // close modal
    setShowModal(false);
  }

  const { t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    }
  }, []);

  return (
    <Modal show={showModal} onHide={handleCloseModal}>
      <Modal.Header closeButton>
        <Modal.Title>{t("cRemoveFromPersonalListTitle")}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form onSubmit={removeObjectHandler}>
          <p className="mb-3">{t("cRemoveFromPersonalListConfirm")}?</p>

          <button type="submit" className="btn btn-more03 me-2 mb-2">
            {t("cRemoveFromPersonalListButton")}
          </button>
        </form>
      </Modal.Body>
    </Modal>
  );
}
