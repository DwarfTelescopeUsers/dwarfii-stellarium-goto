import { useContext, useState } from "react";
import Head from "next/head";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import StatusBar from "@/components/shared/StatusBar";
import DwarfCameras from "@/components/DwarfCameras";
import ImagingMenu from "@/components/imaging/ImagingMenu";

export default function AstroPhoto() {
  useSetupConnection();
  let connectionCtx = useContext(ConnectionContext);

  const [showWideangle, setShowWideangle] = useState(true);
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
        <StatusBar mode="astro" />

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
      <StatusBar mode="astro" />
      <div className="container">
        <div className="row">
          <main className="col-11">
            <DwarfCameras showWideangle={showWideangle} />
          </main>

          <div className="sidebar border border-right col-1">
            <ImagingMenu setShowWideangle={setShowWideangle} />
          </div>
        </div>
      </div>
    </>
  );
}
