import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useState, useContext, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { AstroObject } from "@/types";
import { renderLocalRiseSetTime } from "@/lib/astro_utils";
import { centerHandler, startGotoHandler } from "@/lib/goto_utils";
import eventBus from "@/lib/event_bus";
import GotoModal from "./GotoModal";

type AstronomyObjectPropType = {
  object: AstroObject;
  setModule: Dispatch<SetStateAction<string | undefined>>;
  setErrors: Dispatch<SetStateAction<string | undefined>>;
  setSuccess: Dispatch<SetStateAction<string | undefined>>;
};
type Message = {
  [k: string]: string;
};
export default function PlanetObject(props: AstronomyObjectPropType) {
  const { object } = props;
  const { setModule, setErrors, setSuccess } = props;

  let connectionCtx = useContext(ConnectionContext);
  const [showModal, setShowModal] = useState(false);
  const [gotoMessages, setGotoMessages] = useState<Message[]>([] as Message[]);

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
    setModule(t("cCalibrationDwarfLogProcessSolarObject"));
    eventBus.on("clearErrors", () => {
      setErrors(undefined);
    });
    eventBus.on("clearSuccess", () => {
      setSuccess(undefined);
    });
  }, []);

  function renderRiseSetTime(object: AstroObject) {
    if (connectionCtx.latitude && connectionCtx.longitude) {
      let timesObject = renderLocalRiseSetTime(
        object,
        connectionCtx.latitude,
        connectionCtx.longitude,
      );

      if (timesObject?.error) {
        return <span>{timesObject.error}</span>;
      }

      if (timesObject) {
        return (
          <span>
            Rises: {timesObject.rise}, Sets: {timesObject.set}
          </span>
        );
      }
    }
  }

  function gotoFn() {
    let planet = -1;
    if (object.displayName === "Mercury") {
      planet = 1;
    } else if (object.displayName === "Venus") {
      planet = 2;
    } else if (object.displayName === "Mars") {
      planet = 3;
    } else if (object.displayName === "Jupiter") {
      planet = 4;
    } else if (object.displayName === "Saturn") {
      planet = 5;
    } else if (object.displayName === "Uranus") {
      planet = 6;
    } else if (object.displayName === "Neptune") {
      planet = 7;
    } else if (object.displayName === "Moon") {
      planet = 8;
    } else if (object.displayName === "Sun") {
      planet = 9;
    } else {
      planet = 7;
    }
    setShowModal(connectionCtx.loggerView);
    startGotoHandler(
      connectionCtx,
      setErrors,
      setSuccess,
      planet,
      undefined,
      undefined,
      object.displayName,
      (options) => {
        setGotoMessages((prev) => prev.concat(options));
      },
    );
  }

  return (
    <article className="dw-target-card">
      <header className="dw-target-card-heading">
        <div className="dw-target-object-icon" aria-hidden="true">
          <i className="bi bi-globe2" />
        </div>
        <div>
          <h3>{object.displayName}</h3>
          <p>Solar system object</p>
        </div>
      </header>
      <div className="dw-target-card-grid is-planet">
        <dl className="dw-target-details">
          <div>
            <dt>Magnitude</dt>
            <dd>{object.magnitude ?? "—"}</dd>
          </div>
          <div>
            <dt>Visibility</dt>
            <dd>
              {renderRiseSetTime(object) ||
                "Set an observing location to calculate rise and set times."}
            </dd>
          </div>
        </dl>
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
            Center
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
            Goto
          </button>
          <GotoModal
            object={object}
            showModal={showModal}
            setShowModal={setShowModal}
            messages={gotoMessages}
            setMessages={setGotoMessages}
          />
        </div>
      </div>
    </article>
  );
}
