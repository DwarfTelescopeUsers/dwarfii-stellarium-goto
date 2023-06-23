import { useContext, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import StatusBar from "@/components/shared/StatusBar";
import DwarfCameras from "@/components/DwarfCameras";
import ImagingMenu from "@/components/ImagingMenu";

export default function AstroPhoto() {
  useSetupConnection();
  let connectionCtx = useContext(ConnectionContext);

  const [showWideangle, setShowWideangle] = useState(true);
  if (
    connectionCtx.connectionStatus === undefined ||
    connectionCtx.connectionStatus === false
  ) {
    return (
      <>
        <Head>
          <title>Astro Photos</title>
        </Head>
        <StatusBar mode="astro" />

        <h1>Astro Photos</h1>

        <p>
          You need to <Link href="/setup-scope">connect</Link> this site to
          Dwarf II.
        </p>
      </>
    );
  }

  if (connectionCtx.latitude === undefined) {
    return (
      <>
        <Head>
          <title>Astro Photos</title>
        </Head>
        <StatusBar mode="astro" />

        <h1>Astro Photos</h1>
        <p>
          You need to <Link href="/setup-scope">set your location</Link> before
          taking astro photos.
        </p>
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
