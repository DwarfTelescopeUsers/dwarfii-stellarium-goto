import { useContext, useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

import { ConnectionContext } from "@/stores/ConnectionContext";

import DwarfCameras from "@/components/DwarfCameras";
import ImagingMenu from "@/components/imaging/ImagingMenu";
import SessionPreview from "@/components/imaging/SessionPreview";

export default function AstroPhoto() {
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

  let connectionCtx = useContext(ConnectionContext);
  const [exchangeCamerasStatus, setExchangeCamerasStatus] = useState(false);
  // The wide camera is the framing overlay for the telephoto preview. Keep it
  // visible by default so starting the wide stream cannot succeed invisibly.
  const [showWideangle, setShowWideangle] = useState(true);
  const [useRawPreviewURL, setUseRawPreviewURL] = useState(false);

  let notConnected =
    connectionCtx.connectionStatus === undefined ||
    connectionCtx.connectionStatus === false;
  let noCoordinates =
    connectionCtx.latitude === undefined ||
    connectionCtx.longitude === undefined;
  let hasErrors = notConnected || noCoordinates;

  if (hasErrors) {
    return (
      <div className="dw-page">
        <Head>
          <title>{t("cCameraTitle")}</title>
        </Head>
        <header className="dw-page-header">
          <div>
            <p className="dw-eyebrow">Observe</p>
            <h1>Camera workspace</h1>
            <p>
              Live preview, framing, focus and capture controls for your DWARF.
            </p>
          </div>
        </header>
        <section className="dw-empty-state" role="status">
          <div className="dw-empty-state-icon">
            <i className="bi bi-camera-video-off" aria-hidden="true" />
          </div>
          <h2>Camera workspace is not ready</h2>
          <p>
            Complete the items below, then return here to start the live
            preview.
          </p>
          <ul className="dw-check-list">
            <li>
              <i
                className={`bi ${notConnected ? "bi-exclamation-circle" : "bi-check-circle"}`}
                aria-hidden="true"
              />
              <span>
                {notConnected
                  ? t("cCameraConnection", {
                      DwarfType: connectionCtx.typeNameDwarf,
                    })
                  : `${connectionCtx.typeNameDwarf} is connected.`}
              </span>
            </li>
            <li>
              <i
                className={`bi ${noCoordinates ? "bi-exclamation-circle" : "bi-check-circle"}`}
                aria-hidden="true"
              />
              <span>
                {noCoordinates
                  ? t("cCameraLocation")
                  : "Observing location is set."}
              </span>
            </li>
          </ul>
          <div className="dw-action-row" style={{ justifyContent: "center" }}>
            <Link href="/setup-scope" className="dw-button">
              <i className="bi bi-router" aria-hidden="true" />
              Open connection setup
            </Link>
            <Link href="/" className="dw-button is-secondary">
              Back to dashboard
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="dw-page">
      <Head>
        <title>{t("cCameraTitle")}</title>
      </Head>
      <header className="dw-page-header">
        <div>
          <p className="dw-eyebrow">Observe</p>
          <h1>Camera workspace</h1>
          <p>
            Frame your target, tune the optics and control the active capture.
          </p>
        </div>
      </header>
      <div className="dw-camera-layout">
        <section
          className="dw-camera-stage"
          aria-label={
            connectionCtx.imagingSession.isRecording
              ? "Live session preview"
              : "Live camera preview"
          }
        >
          <div className="container">
            <div className="row px-0">
              <main className="col">
                {connectionCtx.imagingSession.isRecording ? (
                  <SessionPreview />
                ) : (
                  <DwarfCameras
                    setExchangeCamerasStatus={setExchangeCamerasStatus}
                    showWideangle={showWideangle}
                    useRawPreviewURL={useRawPreviewURL}
                    showControls={true}
                  />
                )}
              </main>
            </div>
          </div>
        </section>
        <section className="dw-camera-controls" aria-label="Camera controls">
          <div className="dropdown-wrapper px-0">
            <ImagingMenu
              exchangeCamerasStatus={exchangeCamerasStatus}
              setShowWideangle={setShowWideangle}
              setUseRawPreviewURL={setUseRawPreviewURL}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
