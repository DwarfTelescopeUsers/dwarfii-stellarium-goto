import { useContext, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

import { AstroObject } from "@/types";
import DSOList from "@/components/astroObjects/DSOList";
import PlanetsList from "@/components/astroObjects/PlanetsList";
import dsoCatalog from "../../data/catalogs/dso_catalog.json";
import { processObjectListOpenNGC } from "@/lib/observation_lists_utils";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  saveCurrentObjectListNameDb,
  fetchObjectListByNameDb,
} from "@/db/db_utils";

let dsoObject = processObjectListOpenNGC(dsoCatalog);

type PropType = {
  objectFavoriteNames: string[];
  setObjectFavoriteNames: Dispatch<SetStateAction<string[]>>;
  objectPersonalList: AstroObject[];
  setObjectPersonalList: Dispatch<SetStateAction<AstroObject[]>>;
  setModule: Dispatch<SetStateAction<string | undefined>>;
  setErrors: Dispatch<SetStateAction<string | undefined>>;
  setSuccess: Dispatch<SetStateAction<string | undefined>>;
};

export default function AutoGoto(props: PropType) {
  const { objectFavoriteNames, setObjectFavoriteNames } = props;
  const { objectPersonalList, setObjectPersonalList } = props;
  const { setModule, setErrors, setSuccess } = props;

  const { t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  let connectionCtx = useContext(ConnectionContext);

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    }
  }, []);

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

  function selectListHandler(e: ChangeEvent<HTMLSelectElement>) {
    connectionCtx.setCurrentObjectListName(e.target.value);
    saveCurrentObjectListNameDb(e.target.value);
  }

  let showInstructions =
    connectionCtx.currentObjectListName === "default" ||
    connectionCtx.currentObjectListName === undefined;

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

      <label className="dw-target-catalog-field" htmlFor="target-catalog">
        <span>Target catalog</span>
        <select
          id="target-catalog"
          className="form-select-dso"
          value={connectionCtx.currentObjectListName || "default"}
          onChange={selectListHandler}
        >
          <option value="default">{t("cGoToListdefault")}</option>
          <option value="dso">DSO</option>
          <option value="planets">{t("cGotoListplanets")}</option>
        </select>
      </label>
      {showInstructions && (
        <section className="dw-target-guide">
          <h2>{t("cGotoListSelectObject")}</h2>

          <ol>
            <li>
              {t("cGotoListDSOList")}
              <ul>
                <li>{t("cGotoListDSOList1")}</li>
                <li>{t("cGotoListDSOList2")}</li>
                <li>{t("cGotoListDSOList3")}</li>
                <li>{t("cGotoListDSOList4")}</li>
              </ul>
            </li>
            <li>
              {t("cGotoListDSOList5", {
                DwarfType: connectionCtx.typeNameDwarf,
              })}
            </li>
          </ol>
          <p>
            {t("cGotoListinfo", { DwarfType: connectionCtx.typeNameDwarf })}
          </p>
        </section>
      )}
      {connectionCtx.currentObjectListName === "dso" && (
        <DSOList
          objects={dsoObject}
          objectFavoriteNames={objectFavoriteNames}
          setObjectFavoriteNames={setObjectFavoriteNames}
          objectPersonalList={objectPersonalList}
          setObjectPersonalList={setObjectPersonalList}
          isInObjectPersonalList={false}
          setModule={setModule}
          setErrors={setErrors}
          setSuccess={setSuccess}
        ></DSOList>
      )}
      {connectionCtx.currentObjectListName === "planets" && (
        <PlanetsList
          setModule={setModule}
          setErrors={setErrors}
          setSuccess={setSuccess}
        ></PlanetsList>
      )}
    </div>
  );
}
