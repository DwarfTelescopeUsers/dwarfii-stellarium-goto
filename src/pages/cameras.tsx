import { useContext, useState } from "react";
import Head from "next/head";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";

import StatusBar from "@/components/shared/StatusBar";
import DwarfCameras from "@/components/DwarfCameras";
import ImagingMenu from "@/components/imaging/ImagingMenu";

export default function AstroPhoto() {
  useSetupConnection();
  useLoadIntialValues();
  let connectionCtx = useContext(ConnectionContext);

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
      <>
        <Head>
          <title>Astro Photos</title>
        </Head>
        <StatusBar />

        <h1>Astro Photos</h1>

        {notConnected && (
          <p className="text-danger">You must connect to Dwarf II.</p>
        )}

        {noCoordinates && (
          <p className="text-danger">You must set your location.</p>
        )}
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Astro Photos</title>
      </Head>
      <StatusBar />
      <div className="container">
        <div className="row px-0">
          <main className="col">
            <DwarfCameras
              showWideangle={showWideangle}
              useRawPreviewURL={useRawPreviewURL}
            />
          </main>

          <div style={{ width: "60px" }} className="px-0">
            <ImagingMenu
              setShowWideangle={setShowWideangle}
              setUseRawPreviewURL={setUseRawPreviewURL}
            />
          </div>
        </div>
      </div>
    </>
  );
}
