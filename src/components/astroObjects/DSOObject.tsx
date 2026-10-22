import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useState, useContext, useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { AstroObject } from "@/types";
import {
  renderLocalRiseSetTime,
  computeRaDecToAltAz,
  convertAzToCardinal,
} from "@/lib/astro_utils";
import { centerHandler, startGotoHandler } from "@/lib/goto_utils";
import eventBus from "@/lib/event_bus";
import {
  convertHMSToDecimalDegrees,
  convertDMSToDecimalDegrees,
} from "@/lib/math_utils";
import { toIsoStringInLocalTime } from "@/lib/date_utils";
import {
  saveObjectFavoriteNamesDb,
  saveObjectListsByNameDb,
} from "@/db/db_utils";
import RemoveFromPersonalLibrary from "@/components/RemoveFromPersonalLibModal";
import GotoModal from "./GotoModal";

type AstronomyObjectPropType = {
  object: AstroObject;
  objectFavoriteNames: string[];
  setObjectFavoriteNames: Dispatch<SetStateAction<string[]>>;
  objectPersonalList: AstroObject[];
  setObjectPersonalList: Dispatch<SetStateAction<AstroObject[]>>;
  isInObjectPersonalList: boolean;
  setModule: Dispatch<SetStateAction<string | undefined>>;
  setErrors: Dispatch<SetStateAction<string | undefined>>;
  setSuccess: Dispatch<SetStateAction<string | undefined>>;
};
type Message = {
  [k: string]: string;
};
export default function DSOObject(props: AstronomyObjectPropType) {
  const {
    object,
    objectFavoriteNames,
    setObjectFavoriteNames,
    objectPersonalList,
    setObjectPersonalList,
    isInObjectPersonalList,
    setModule,
    setErrors,
    setSuccess,
  } = props;
  let connectionCtx = useContext(ConnectionContext);
  const [showModal, setShowModal] = useState(false);
  const [gotoMessages, setGotoMessages] = useState<Message[]>([] as Message[]);
  const [forceFavoriteUpdate, setForceFavoriteUpdate] = useState(false);
  const [isInPersonalList, setIsInPersonalList] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

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

  useEffect(() => {
    setModule(t("cCalibrationDwarfLogProcessAstroObject"));
    eventBus.on("clearErrors", () => {
      setErrors(undefined);
    });
    eventBus.on("clearSuccess", () => {
      setSuccess(undefined);
    });
  }, [forceFavoriteUpdate]);

  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    setIsInPersonalList(isInAstroList(objectPersonalList, object.displayName));
  }, [isInPersonalList]);

  // Recalculate all data
  const handleRefreshClick = () => {
    setForceUpdate((prev) => !prev);
  };

  // Reactualize Object
  const handleFavoriteClick = () => {
    let updatedListsNames;
    if (object.favorite) {
      object.favorite = false;
      if (!objectFavoriteNames) updatedListsNames.push(object.displayName);
      else
        updatedListsNames = objectFavoriteNames.filter(
          (name) => name != object.displayName,
        );
      setObjectFavoriteNames(updatedListsNames);
      saveObjectFavoriteNamesDb(updatedListsNames.join("|"));
    } else {
      object.favorite = true;
      updatedListsNames = objectFavoriteNames
        .concat(object.displayName)
        .join("|");
      saveObjectFavoriteNamesDb(updatedListsNames);
      setObjectFavoriteNames(objectFavoriteNames.concat(object.displayName));
    }
    setForceFavoriteUpdate((prev) => !prev);
  };

  function addAstroObject(
    list: AstroObject[],
    newObject: AstroObject,
  ): AstroObject[] {
    const exists = list.some(
      (obj) => obj.displayName === newObject.displayName,
    );
    return exists ? list : [...list, newObject];
  }

  function isInAstroList(list: AstroObject[], name: string): boolean {
    return list.some((obj) => obj.displayName === name);
  }

  function addObjectToPersonalList() {
    const updatedPersonalList = addAstroObject(objectPersonalList, object);

    saveObjectListsByNameDb("personal", JSON.stringify(updatedPersonalList));
    setObjectPersonalList(updatedPersonalList);
    setIsInPersonalList(true);
  }

  function removeObjectToPersonalList() {
    setShowRemoveModal(true);
  }

  // Memorize the calculated data using useMemo
  const riseSetTime = useMemo(() => renderRiseSetTime(), [forceUpdate]);
  const altAz = useMemo(
    () => renderAltAz(),
    [forceUpdate, connectionCtx.visibleSkyLimit],
  );
  const raDec = useMemo(() => renderRADec(), [forceUpdate]);

  function renderRiseSetTime() {
    if (connectionCtx.latitude && connectionCtx.longitude) {
      let timesObject = renderLocalRiseSetTime(
        object,
        connectionCtx.latitude,
        connectionCtx.longitude,
      );

      if (timesObject?.error) {
        return <span>{t(timesObject.error)}</span>;
      }

      if (timesObject) {
        return (
          <span>
            {t("cObjectsRises")}: {timesObject.rise}, {t("cObjectsSets")}:{" "}
            {timesObject.set}
          </span>
        );
      }
    }
  }

  function renderAltAz() {
    let raDecimal: undefined | number;
    let decDecimal: undefined | number;
    if (object.ra) {
      raDecimal = convertHMSToDecimalDegrees(object.ra);
    }
    if (object.dec) {
      decDecimal = convertDMSToDecimalDegrees(object.dec);
    }

    if (
      connectionCtx.latitude &&
      connectionCtx.longitude &&
      raDecimal &&
      decDecimal
    ) {
      let today = new Date();

      let results = computeRaDecToAltAz(
        connectionCtx.latitude,
        connectionCtx.longitude,
        raDecimal,
        decDecimal,
        toIsoStringInLocalTime(today),
        connectionCtx.timezone,
      );

      let visibility = false;

      // Verify SkyLimit test Cardinal
      if (results && connectionCtx.visibleSkyLimitTarget) {
        const targets = Array.isArray(connectionCtx.visibleSkyLimitTarget)
          ? connectionCtx.visibleSkyLimitTarget
          : [connectionCtx.visibleSkyLimitTarget]; // Wrap single object in an array if it's not already an array

        let notPresentInDirection = true;
        for (const target of targets) {
          if (
            target &&
            typeof target === "object" &&
            "number" in target &&
            "directions" in target
          ) {
            const isInTargetDirections = target.directions.includes(
              convertAzToCardinal(results.az),
            );
            if (isInTargetDirections) notPresentInDirection = false;
            if (results.alt >= target.number && isInTargetDirections) {
              visibility = true;
              break; // Exit loop early if visibility is set to true
            }
          }
        }
        // case where Current direction is not Limited (not Present)
        object.visible = visibility;
        if (notPresentInDirection && results.alt >= 0) object.visible = true;
      }

      if (results) {
        return (
          <span>
            Alt: {results.alt.toFixed(0)}°, Az: {results.az.toFixed(0)}°{" "}
            {convertAzToCardinal(results.az)}
          </span>
        );
      }
    }
  }

  function renderRADec() {
    if (
      connectionCtx.latitude &&
      connectionCtx.longitude &&
      object.ra &&
      object.dec
    ) {
      return (
        <span>
          RA: {object.ra}, Dec: {object.dec}
        </span>
      );
    }
  }

  function gotoFn() {
    setShowModal(connectionCtx.loggerView);
    startGotoHandler(
      connectionCtx,
      setErrors,
      setSuccess,
      undefined,
      object.ra,
      object.dec,
      object.displayName,
      (options) => {
        setGotoMessages((prev) => prev.concat(options));
      },
    );
  }

  function saveData() {
    connectionCtx.setSaveAstroData(object);
  }

  return (
    <>
      {(!isInObjectPersonalList || isInPersonalList) && (
        <article className="dw-target-card">
          <header className="dw-target-card-heading">
            <button
              type="button"
              className="dw-target-icon-button"
              onClick={handleFavoriteClick}
              aria-label={
                object.favorite
                  ? `Remove ${object.displayName} from favorites`
                  : `Add ${object.displayName} to favorites`
              }
              aria-pressed={object.favorite}
            >
              <i
                className={`bi ${object.favorite ? "bi-heart-fill" : "bi-heart"}`}
                aria-hidden="true"
              />
            </button>
            <div>
              <h3>{object.displayName}</h3>
              {object.alternateNames && <p>{object.alternateNames}</p>}
            </div>
          </header>
          <div className="dw-target-card-grid">
            <dl className="dw-target-details">
              <div>
                <dt>Type</dt>
                <dd>
                  {t(object.type)}{" "}
                  {object.constellation &&
                    t("cObjectsIn") + t(object.constellation)}
                </dd>
              </div>
              <div>
                <dt>{t("cObjectsSize")}</dt>
                <dd>{object.size || "—"}</dd>
              </div>
              <div>
                <dt>{t("cObjectsMagnitude")}</dt>
                <dd>{object.magnitude ?? "—"}</dd>
              </div>
            </dl>
            <div className="dw-target-position">
              {riseSetTime && <p>{riseSetTime}</p>}
              <p>
                {altAz || "Set an observing location to calculate altitude."}
                <button
                  type="button"
                  className="dw-target-refresh-button"
                  onClick={handleRefreshClick}
                  aria-label={`Refresh position for ${object.displayName}`}
                  title="Refresh calculated position"
                >
                  <i className="fa fa-refresh" aria-hidden="true" />
                </button>
              </p>
              {raDec && <p>{raDec}</p>}
            </div>
            <div className="dw-target-actions" aria-label="Target actions">
              <button
                type="button"
                className="dw-target-action is-secondary"
                onClick={() => centerHandler(object, connectionCtx, setErrors)}
                disabled={!connectionCtx.connectionStatusStellarium}
                title={
                  connectionCtx.connectionStatusStellarium
                    ? undefined
                    : "Connect Stellarium to center this target"
                }
              >
                {t("cObjectsCenter")}
              </button>
              <button
                type="button"
                className="dw-target-action"
                onClick={gotoFn}
                disabled={!connectionCtx.connectionStatus}
                title={
                  connectionCtx.connectionStatus
                    ? undefined
                    : "Connect your DWARF to start GOTO"
                }
              >
                {t("cObjectsGoto")}
              </button>
              <button
                type="button"
                className="dw-target-action is-secondary"
                onClick={saveData}
                disabled={
                  !connectionCtx.saveAstroData ||
                  object.displayName == connectionCtx.saveAstroData.displayName
                }
              >
                {t("cObjectsCopyData")}
              </button>
              {!isInPersonalList && (
                <button
                  type="button"
                  className="dw-target-icon-button is-accent"
                  title={t("cObjectsAddPersonal")}
                  aria-label={t("cObjectsAddPersonal")}
                  onClick={addObjectToPersonalList}
                >
                  <i className="bi bi-bookmark-plus" aria-hidden="true" />
                </button>
              )}
              {isInPersonalList && (
                <button
                  type="button"
                  className="dw-target-icon-button is-accent"
                  title={
                    isInObjectPersonalList
                      ? t("cObjectsRemovePersonal")
                      : t("cObjectsInfoPersonal")
                  }
                  aria-label={
                    isInObjectPersonalList
                      ? t("cObjectsRemovePersonal")
                      : t("cObjectsInfoPersonal")
                  }
                  onClick={
                    isInObjectPersonalList
                      ? removeObjectToPersonalList
                      : () => {}
                  }
                >
                  <i className="bi bi-star-fill" aria-hidden="true" />
                </button>
              )}
              <GotoModal
                object={object}
                showModal={showModal}
                setShowModal={setShowModal}
                messages={gotoMessages}
                setMessages={setGotoMessages}
              />
            </div>
          </div>
          <RemoveFromPersonalLibrary
            showModal={showRemoveModal}
            setShowModal={setShowRemoveModal}
            objectName={object.displayName}
            objectPersonalList={objectPersonalList}
            setObjectPersonalList={setObjectPersonalList}
            setIsInPersonalList={setIsInPersonalList}
          />
        </article>
      )}
    </>
  );
}
