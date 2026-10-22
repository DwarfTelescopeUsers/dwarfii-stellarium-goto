import { wrapper } from "@/components/asteroids/api/store";
import { Provider } from "react-redux";
import "@/styles/globals.css";
import "@/styles/bootstrap.min.css";
import "@/styles/font-awesome.min.css";
import "@/styles/style.min.css";
import "@/styles/all.min.css";
import "@/styles/navbar.css";
import "@/styles/modal.css";
import "@/styles/sliding-pane.css";
import "@/styles/weather.css";
import "@/styles/clouds.css";
import "@/styles/Calendar.css";
import "@/styles/asteroids.css";
import "@/styles/image-editor.css";
import "@/styles/mosaic.css";
import "@/styles/camera.css";
import "@/styles/dwarfium-ui.css";
import "@/styles/moonphase.css";

import "bootstrap-icons/font/bootstrap-icons.css";
import "@/fontello/css/custom-focus.css";

import type { AppProps } from "next/app";
import { useEffect } from "react";

import Layout from "@/components/shared/Layout";
import { ConnectionContextProvider } from "@/stores/ConnectionContext";
import { FleetProvider } from "@/stores/FleetContext";
import SetupLifecycle from "@/components/fleet/SetupLifecycle";
import FleetWorkspace from "@/components/fleet/FleetWorkspace";

export default function App({ Component, pageProps }: AppProps) {
  const { store, props } = wrapper.useWrappedStore(pageProps);

  useEffect(() => {
    require("bootstrap/dist/js/bootstrap.bundle.min.js");

    const checkDesktopUpdate = async () => {
      const { isTauri } = await import("@tauri-apps/api/core");
      if (!isTauri()) return;

      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (
          update?.available &&
          window.confirm(
            `Dwarfium ${update.version} is available. Install it now?`,
          )
        ) {
          await update.downloadAndInstall();
          const { relaunch } = await import("@tauri-apps/plugin-process");
          await relaunch();
        }
      } catch (error) {
        console.error("Failed to check for a desktop update:", error);
      }
    };

    void checkDesktopUpdate();
  }, []);

  return (
    <ConnectionContextProvider>
      <FleetProvider>
        <SetupLifecycle />
        <Provider store={store}>
          <Layout>
            <FleetWorkspace>
              <Component {...props.pageProps} />
            </FleetWorkspace>
          </Layout>
        </Provider>
      </FleetProvider>
    </ConnectionContextProvider>
  );
}
