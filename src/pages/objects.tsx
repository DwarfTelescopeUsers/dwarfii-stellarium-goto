import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";
import i18n from "@/i18n";

import { useContext } from "react";

import GotoStellarium from "@/components/GotoStellarium";
import GotoLists from "@/components/GotoLists";
import GotoUserLists from "@/components/GotoUserLists";
import Asteroids from "@/components/Asteroids";
import CalibrationDwarf from "@/components/shared/CalibrationDwarf";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { fetchObjectFavoriteNamesDb } from "@/db/db_utils";
import { AstroObject } from "@/types";

import ResizablePIP from "@/components/ResizablePIP";
import DwarfCameras from "@/components/DwarfCameras";
import PageHeader from "@/components/shared/PageHeader";

export default function Goto() {
  let connectionCtx = useContext(ConnectionContext);
  const { t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [objectFavoriteNames, setObjectFavoriteNames] = useState<string[]>([]);
  const [objectPersonalList, setObjectPersonalList] = useState<AstroObject[]>(
    [],
  );
  const [errors, setErrors] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [module, setModule] = useState<string | undefined>();
  const [isVisible, setIsVisible] = useState(true);
  const [message, setMessage] = useState<string | undefined>();
  const prevErrors = usePrevious(errors);
  const prevSuccess = usePrevious(success);

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    }
  }, []);

  // custom hook for getting previous value
  function usePrevious(value: any) {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    }, [value]);
    return ref.current;
  }

  useEffect(() => {
    // get objects lists from local storage on page load
    let favoriteNames = fetchObjectFavoriteNamesDb();
    if (favoriteNames) {
      setObjectFavoriteNames(favoriteNames);
    }
  }, []);

  useEffect(() => {
    let new_message =
      (prevErrors ?? "") +
      (errors ?? "") +
      (prevSuccess ?? "") +
      (success ?? "");
    if (new_message != (message ?? "")) {
      setIsVisible(true);
      setMessage(new_message);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 30000);

      // Clear the timeout if new messages come in within the 10 seconds
      return () => clearTimeout(timer);
    }
  }, [prevErrors, errors, prevSuccess, success]);

  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Observe"
        title="Target explorer"
        description="Choose a celestial target, calibrate the mount and start a precise GOTO."
      />
      <details className="dw-setup-section dw-target-calibration">
        <summary>
          <i className="bi bi-compass" aria-hidden="true" />
          Mount calibration and position controls
        </summary>
        <div className="dw-setup-section-body">
          <CalibrationDwarf
            setModule={setModule}
            setErrors={setErrors}
            setSuccess={setSuccess}
          />
        </div>
      </details>
      <section className="dw-panel dw-target-browser">
        <ul
          className="dw-segmented-tabs"
          role="tablist"
          aria-label="Target sources"
        >
          {[
            { value: "lists", label: t("pObjectsList") },
            { value: "userLists", label: t("pObjectsCustomsList") },
            { value: "stellarium", label: "Stellarium" },
            { value: "asteroids", label: "Asteroids" },
          ].map((tab) => (
            <li key={tab.value} role="presentation">
              <button
                type="button"
                className={connectionCtx.gotoType === tab.value ? "active" : ""}
                role="tab"
                aria-selected={connectionCtx.gotoType === tab.value}
                tabIndex={connectionCtx.gotoType === tab.value ? 0 : -1}
                onClick={() => connectionCtx.setGotoType(tab.value)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="dw-target-content" role="tabpanel">
          {connectionCtx.connectionStatus && connectionCtx.PiPView && (
            <div className="float-right-align">
              <ResizablePIP
                width={320}
                height={190}
                minConstraints={[320, 190]}
                maxConstraints={[1280, 730]}
              >
                <DwarfCameras
                  setExchangeCamerasStatus={function () {}}
                  showWideangle={false}
                  useRawPreviewURL={false}
                  showControls={false}
                />
              </ResizablePIP>
            </div>
          )}
          {connectionCtx.gotoType === "lists" && (
            <GotoLists
              objectFavoriteNames={objectFavoriteNames}
              setObjectFavoriteNames={setObjectFavoriteNames}
              objectPersonalList={objectPersonalList}
              setObjectPersonalList={setObjectPersonalList}
              setModule={setModule}
              setErrors={setErrors}
              setSuccess={setSuccess}
            ></GotoLists>
          )}
          {connectionCtx.gotoType === "stellarium" && (
            <GotoStellarium
              objectFavoriteNames={objectFavoriteNames}
              setObjectFavoriteNames={setObjectFavoriteNames}
              objectPersonalList={objectPersonalList}
              setObjectPersonalList={setObjectPersonalList}
              setModule={setModule}
              setErrors={setErrors}
              setSuccess={setSuccess}
            ></GotoStellarium>
          )}
          {connectionCtx.gotoType === "userLists" && (
            <GotoUserLists
              objectFavoriteNames={objectFavoriteNames}
              setObjectFavoriteNames={setObjectFavoriteNames}
              objectPersonalList={objectPersonalList}
              setObjectPersonalList={setObjectPersonalList}
              setModule={setModule}
              setErrors={setErrors}
              setSuccess={setSuccess}
            ></GotoUserLists>
          )}
          {connectionCtx.gotoType === "asteroids" && (
            <Asteroids
              setModule={setModule}
              setErrors={setErrors}
              setSuccess={setSuccess}
            ></Asteroids>
          )}
        </div>
      </section>
      {isVisible && (prevErrors || errors || prevSuccess || success) && (
        <div className="dw-toast" role="status">
          {module && (
            <span>
              <b> {module} </b>{" "}
            </span>
          )}
          {prevErrors && (
            <span className="text-danger">
              <b>{prevErrors} </b>
            </span>
          )}
          {errors && errors != prevErrors && (
            <span className="text-danger">
              <b>{errors} </b>
            </span>
          )}
          {prevSuccess && (
            <span className="text-success">
              <b>{prevSuccess} </b>
            </span>
          )}
          {success && success != prevSuccess && (
            <span className="text-success">
              <b>{success} </b>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
