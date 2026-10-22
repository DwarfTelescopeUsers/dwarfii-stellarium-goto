import { useState, useEffect, useContext } from "react";
import type { ChangeEvent } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

import { ConnectionContext } from "@/stores/ConnectionContext";
import DSOList from "@/components/astroObjects/DSOList";
import ImportObjectListModal from "@/components/ImportObservationListModal";
import DeleteObjectListModal from "./DeleteObservationListModal";
import { AstroObject } from "@/types";
import {
  fetchObjectListsDb,
  fetchObjectListsNamesDb,
  fetchObjectListByNameDb,
  saveUserCurrentObjectListNameDb,
} from "@/db/db_utils";

type PropType = {
  objectFavoriteNames: string[];
  setObjectFavoriteNames: Dispatch<SetStateAction<string[]>>;
  objectPersonalList: AstroObject[];
  setObjectPersonalList: Dispatch<SetStateAction<AstroObject[]>>;
  setModule: Dispatch<SetStateAction<string | undefined>>;
  setErrors: Dispatch<SetStateAction<string | undefined>>;
  setSuccess: Dispatch<SetStateAction<string | undefined>>;
};

export default function GotoUserLists(props: PropType) {
  const { objectFavoriteNames, setObjectFavoriteNames } = props;
  const { objectPersonalList, setObjectPersonalList } = props;
  const { setModule, setErrors, setSuccess } = props;

  let connectionCtx = useContext(ConnectionContext);

  let [objectListsNames, setObjectListsNames] = useState<string[]>([]);
  let [objectLists, setObjectLists] = useState<{
    [k: string]: AstroObject[];
  }>({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectPersonalList, setSelectPersonalList] = useState(
    connectionCtx.currentUserObjectListName === "personal",
  );

  useEffect(() => {
    try {
      // get objects lists from local storage on page load
      console.log("Load personalObjecList on load");
      let personalObjecList = fetchObjectListByNameDb("personal");
      if (personalObjecList) {
        setObjectPersonalList(personalObjecList);
        console.log(
          "Loaded  personalObjecList on load: ",
          personalObjecList.length,
        );
      } else {
        console.log("No personalObjecList found in DB");
      }
    } catch (error) {
      console.error("Error personalObjecList on load", error);
    }
  }, []);

  useEffect(() => {
    // get objects lists from local storage personal list change
    let names = fetchObjectListsNamesDb();
    if (names) {
      setObjectListsNames(names);
    }
    let lists = fetchObjectListsDb();
    console.log("List Objects", lists);
    if (lists) {
      setObjectLists(lists);
    }
  }, [objectPersonalList]);

  function selectListHandler(e: ChangeEvent<HTMLSelectElement>) {
    let listName = e.target.value;
    setSelectPersonalList(listName == "personal");
    connectionCtx.setUserCurrentObjectListName(listName);
    saveUserCurrentObjectListNameDb(listName);
  }

  let showInstructions =
    objectListsNames.length === 0 ||
    connectionCtx.currentUserObjectListName === "default";

  function importListModalHandle() {
    setShowImportModal(true);
  }

  function deleteListModalHandle() {
    setShowDeleteModal(true);
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
    <div className="dw-target-source">
      <div className="dw-target-notices" aria-live="polite">
        {!connectionCtx.connectionStatusStellarium && (
          <div className="dw-target-notice is-warning">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            <span>{t("cGoToListConnectStellarium")}</span>
          </div>
        )}
        {!connectionCtx.connectionStatus && (
          <div className="dw-target-notice is-warning">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            <span>
              {t("cGoToListConnectDwarf", {
                DwarfType: connectionCtx.typeNameDwarf,
              })}
            </span>
          </div>
        )}
      </div>

      <div className="dw-target-toolbar">
        <label className="dw-target-catalog-field" htmlFor="custom-target-list">
          <span>Observation list</span>
          <select
            id="custom-target-list"
            className="form-select"
            value={connectionCtx.currentUserObjectListName || "default"}
            onChange={selectListHandler}
          >
            <option value="default">{t("cGoToListdefault")}</option>
            <option value="personal">{t("cGoToListpersonal")}</option>
            {objectListsNames.map((list, index) => (
              <option key={index} value={list}>
                {list}
              </option>
            ))}
          </select>
        </label>

        <div className="dw-target-toolbar-actions">
          <button
            type="button"
            className="dw-target-action"
            onClick={importListModalHandle}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            {t("cGoToUserListNewList")}
          </button>
          {!selectPersonalList &&
            connectionCtx.currentUserObjectListName !== "default" && (
              <button
                type="button"
                className="dw-target-action is-danger"
                onClick={deleteListModalHandle}
              >
                <i className="bi bi-trash" aria-hidden="true" />
                {t("cGoToUserListDeleteList")}
              </button>
            )}
        </div>
      </div>

      {connectionCtx.currentUserObjectListName &&
        objectLists[connectionCtx.currentUserObjectListName] && (
          <DSOList
            objects={objectLists[connectionCtx.currentUserObjectListName]}
            objectFavoriteNames={objectFavoriteNames}
            setObjectFavoriteNames={setObjectFavoriteNames}
            objectPersonalList={objectPersonalList}
            setObjectPersonalList={setObjectPersonalList}
            isInObjectPersonalList={selectPersonalList}
            setModule={setModule}
            setErrors={setErrors}
            setSuccess={setSuccess}
          ></DSOList>
        )}

      {showInstructions && (
        <section className="dw-target-guide">
          <h2>Build a reusable observing list</h2>
          <p
            dangerouslySetInnerHTML={{
              __html: t("cGoToUserListCustomObjectsListInstruction1"),
            }}
          />

          <p>{t("cGoToUserListCustomObjectsListInstruction2")}</p>
          <p>{t("cGoToUserListCustomObjectsListInstruction3")}</p>
        </section>
      )}
      <ImportObjectListModal
        showModal={showImportModal}
        setShowModal={setShowImportModal}
        objectListsNames={objectListsNames}
        setObjectListsNames={setObjectListsNames}
        objectLists={objectLists}
        setObjectLists={setObjectLists}
      />
      <DeleteObjectListModal
        showModal={showDeleteModal}
        setShowModal={setShowDeleteModal}
        objectListsNames={objectListsNames}
        setObjectListsNames={setObjectListsNames}
        objectLists={objectLists}
        setObjectLists={setObjectLists}
      />
    </div>
  );
}
