import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useEffect, useContext, useState, useRef } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { isTauri } from "@tauri-apps/api/core";
import { statusPath, stellariumRequestUrl } from "@/lib/stellarium_utils";
import {
  getProxyUrl,
  getServerUrl,
  checkHealth,
  compareURLsIgnoringPort,
} from "@/lib/get_proxy_url";

import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  saveConnectionStatusStellariumDB,
  saveIPStellariumDB,
  savePortStellariumDB,
  saveUrlStellariumDB,
} from "@/db/db_utils";

type PropType = {
  showInfoTxt: boolean | undefined;
};

export default function ConnectStellarium(props: PropType) {
  const { showInfoTxt } = props;

  let connectionCtx = useContext(ConnectionContext);

  const [connecting, setConnecting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showInfoTxtData, setShowInfoTxtData] = useState(true);
  const [url_plugin, setUrl_plugin] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const [portStellarium, setPortStellarium] = useState(
    connectionCtx.portStellarium || "8090",
  );

  const handlePortChange = (e) => {
    setPortStellarium(e.target.value);
  };

  function checkConnection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const formIP = formData.get("stellarium_ip")?.toString().trim();
    const formPort = formData.get("port");
    const port = formPort ? Number(formPort) : 8090;

    if (formIP && Number.isInteger(port) && port > 0 && port <= 65535) {
      setConnecting(true);
      let url = `http://${formIP}:${port}`;

      setPortStellarium(port);
      connectionCtx.setPortStellarium(port);
      savePortStellariumDB(port);

      connectionCtx.setIPStellarium(formIP.toString());
      connectionCtx.setUrlStellarium(url);

      saveIPStellariumDB(formIP.toString());
      saveUrlStellariumDB(url);

      const statusUrl = stellariumRequestUrl(
        `${url}${statusPath}`,
        connectionCtx,
      );
      fetch(statusUrl, { signal: AbortSignal.timeout(5000) })
        .then((response) => {
          if (!response.ok)
            throw new Error(`Stellarium returned HTTP ${response.status}`);
          return response.json();
        })
        .then((status) => {
          if (!status || typeof status !== "object") {
            throw new Error("Stellarium did not return status data");
          }
          setConnecting(false);
          connectionCtx.setConnectionStatusStellarium(true);
          saveConnectionStatusStellariumDB(true);
        })
        .catch((err) => {
          console.log("Stellarium connection error:", err);
          setConnecting(false);
          connectionCtx.setConnectionStatusStellarium(false);
          saveConnectionStatusStellariumDB(false);
        });
    }
  }

  function renderConnectionStatus() {
    if (connecting) {
      return <span>Connecting...</span>;
    }
    if (connectionCtx.connectionStatusStellarium === undefined) {
      return <></>;
    }
    if (connectionCtx.connectionStatusStellarium === false) {
      return (
        <span className="text-danger-connect">{t("pConnectingFailed")}</span>
      );
    }

    return (
      <span className="text-success-connect">
        {t("pConnectionSuccessFull")}
      </span>
    );
  }
  const { t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    if (connectionCtx.portStellarium) {
      setPortStellarium(connectionCtx.portStellarium);
    }
  }, [connectionCtx.portStellarium]);

  useEffect(() => {
    console.log("Effect triggered, aborting previous request if exists...");
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Abort the previous request
    }
    abortControllerRef.current = new AbortController(); // Create a new one
    const signal = abortControllerRef.current.signal;

    if (showInfoTxt !== undefined && !showInfoTxt) setShowInfoTxtData(false);

    if (isTauri()) {
      setUrl_plugin("");
    } else {
      // Test Proxy
      const getUrlStellariumConfig = async (signal: AbortSignal) => {
        let serverUrl = getServerUrl();
        let proxyUrl = getProxyUrl(connectionCtx);
        let urlStellariumConfig = "";

        try {
          if (proxyUrl && proxyUrl.includes("api")) {
            urlStellariumConfig = await checkHealth(
              "/api/stellarium-config-health",
              3000,
              signal,
            );
          } else {
            let sameProxyServer = compareURLsIgnoringPort(proxyUrl, serverUrl);
            if (sameProxyServer) {
              // check on Server first
              urlStellariumConfig = await checkHealth(
                serverUrl + "/stellarium-config-health",
                3000,
                signal,
              );
              // check on Proxy if not found
              if (!urlStellariumConfig) {
                urlStellariumConfig = await checkHealth(
                  proxyUrl + "/stellarium-config-health",
                  3000,
                  signal,
                );
                if (urlStellariumConfig) {
                  urlStellariumConfig = proxyUrl + urlStellariumConfig;
                }
              }
            } else {
              // check on Proxy first
              urlStellariumConfig = await checkHealth(
                proxyUrl + "/stellarium-config-health",
                3000,
                signal,
              );
              if (urlStellariumConfig) {
                urlStellariumConfig = proxyUrl + urlStellariumConfig;
              }
              // check on Server if not found
              else {
                urlStellariumConfig = await checkHealth(
                  serverUrl + "/stellarium-config-health",
                  3000,
                  signal,
                );
              }
            }
          }
          if (urlStellariumConfig)
            setUrl_plugin(urlStellariumConfig + `?port=${portStellarium}`);
        } catch (error: unknown) {
          if (error instanceof Error) {
            if (signal.aborted) {
              console.log("getUrlStellariumConfig aborted due to new request.");
            } else {
              console.error("Error in getUrlStellariumConfig:", error);
            }
          } else {
            console.error("An unknown error occurred:", error);
          }
        }
      };
      getUrlStellariumConfig(signal);
    }
    return () => {
      console.log("Cancel previous request when effect re-runs");
      abortControllerRef.current?.abort();
    };
  }, [portStellarium]);

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    }
  }, []);

  function savePortStellarium() {
    connectionCtx.setPortStellarium(Number(portStellarium));
    savePortStellariumDB(Number(portStellarium));
  }

  function renderDetails() {
    if (showInfoTxtData)
      return (
        <div>
          <button
            type="button"
            title={showHelp ? t("pHideHelp") : t("pShowHelp")}
            className="dw-help-toggle"
            onClick={() => setShowHelp((prev) => !prev)}
            aria-expanded={showHelp}
          >
            <i className="bi bi-info-circle" aria-hidden="true"></i>
            {showHelp ? t("pHideHelp") : t("pShowHelp")}
          </button>
          {showHelp && (
            <ol className="dw-help-panel">
              <li className="mb-2">{t("pConnectStellariumContent1")}</li>
              <li className="mb-2">
                {t("pConnectStellariumContent2")}{" "}
                <Link href="https://www.youtube.com/watch?v=v2gROUlPRhw">
                  Youtube video
                </Link>{" "}
                {t("pConnectStellariumContent2_1")}
              </li>
              {url_plugin && (
                <li className="mb-2">
                  {t("pConnectStellariumContent2_2")}{" "}
                  <a
                    href={`${url_plugin}`}
                    target="_blank"
                    rel="noopener
                    noreferrer"
                    onClick={() => {
                      savePortStellarium();
                    }}
                  >
                    Stellarium_auto_config
                  </a>{" "}
                </li>
              )}
              <li className="mb-2">{t("pConnectStellariumContent3")}</li>
            </ol>
          )}
        </div>
      );
    else return <ol></ol>;
  }

  return (
    <div>
      <h2>{t("pConnectStellarium")}</h2>

      <p>{showInfoTxtData && t("pConnectStellariumContent")}</p>
      {renderDetails()}
      <form onSubmit={checkConnection} className="dw-connection-form">
        <div className="row mb-3">
          <div className="col-lg-2 col-md-3 text-lg-end">
            <label htmlFor="stellarium_ip" className="form-label">
              {t("pIPAddress")}
            </label>
          </div>
          <div className="col-lg-2 col-md-10  d-flex align-items-center">
            <input
              className="form-control"
              id="stellarium_ip"
              name="stellarium_ip"
              placeholder="127.0.0.1"
              required
              defaultValue={connectionCtx.IPStellarium}
            />
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-lg-2 col-md-3 text-lg-end">
            <label htmlFor="port" className="form-label">
              {t("pPort")}
            </label>
          </div>
          <div className="col-lg-2 col-md-10  d-flex align-items-center">
            <input
              className="form-control"
              id="port"
              name="port"
              type="number"
              min="1"
              max="65535"
              placeholder="8090"
              required
              value={portStellarium}
              onChange={handlePortChange}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-more02 me-3">
          <i className=" icon-connectdevelop" /> {t("pConnect")}
        </button>{" "}
        {renderConnectionStatus()}
      </form>
    </div>
  );
}
