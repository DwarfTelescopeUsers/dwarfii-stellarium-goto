import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";

import Layout from "@/components/shared/Layout";
import { ConnectionContextProvider } from "@/stores/ConnectionContext";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    require("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return (
    <ConnectionContextProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ConnectionContextProvider>
  );
}
