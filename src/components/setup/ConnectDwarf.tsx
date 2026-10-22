import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useEffect, useContext, useState, useRef } from "react";
import type { FormEvent, ChangeEvent } from "react";

import CmdHostLockDwarf from "@/components/setup/CmdHostLockDwarf";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { saveIPDwarfDB, saveIPConnectDB } from "@/db/db_utils";

import { connectionHandler } from "@/lib/connect_utils";
import { useFleetHostGuard } from "@/stores/FleetContext";

const DwarfClientID_original = "0000DAF2-0000-1000-8000-00805F9B34FB";
const DwarfClientID_base = "0000DAF2-0000-1000-8000-00805F9B35";

import {
  DwarfClientID,
  setDwarfClientID,
  WebSocketHandler,
} from "@/services/dwarf";

export default function ConnectDwarf() {
  const fleetOwnsHost = useFleetHostGuard();
  let connectionCtx = useContext(ConnectionContext);
  const [currentDwarfClientID, setCurrentDwarfClientID] =
    useState(DwarfClientID); // Store initial DwarfClientID
  const [isChecked, setIsChecked] = useState(false); // Track checkbox state
  const [randomDwarfClientID, setRandomDwarfClientID] = useState("");
  const originalDwarfClientID = useRef(DwarfClientID_original);

  const [showHelp, setShowHelp] = useState(false);
  const [ipAuto, setIpAuto] = useState(false); // Connection state
  const [ipValue, setIpValue] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [slavemode, setSlavemode] = useState(false);
  const [goLive, setGoLive] = useState(false);
  const [errorTxt, setErrorTxt] = useState("");
  const [debouncedValue, setDebouncedValue] = useState(""); // Debounced value

  // Debouncing logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(ipValue); // Update debounced value after delay
    }, 1500);

    return () => {
      clearTimeout(handler); // Clear timeout on cleanup
    };
  }, [ipValue]);

  // Trigger logic when the debounced value changes
  useEffect(() => {
    if (debouncedValue !== "") {
      connectionCtx.setIPDwarf(debouncedValue);
      saveIPDwarfDB(debouncedValue);
    }
  }, [debouncedValue]);

  useEffect(() => {
    console.log("originalDwarfClientID:" + originalDwarfClientID.current);
    console.log("DwarfClientID:" + DwarfClientID);
    setIsChecked(originalDwarfClientID.current != DwarfClientID);
  }, []);

  useEffect(() => {
    console.log("new IPDwarf:" + connectionCtx.IPDwarf);
    if (connectionCtx.IPDwarf != undefined) {
      setIpAuto(true);
      setIpValue(connectionCtx.IPDwarf);
      setTimeout(reactiveIP, 500);
    }
  }, [connectionCtx.IPDwarf]);

  function reactiveIP() {
    setIpAuto(false);
  }
  async function checkConnection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const formIP = formData.get("ip");
    let IPDwarf = formIP?.toString();
    if (fleetOwnsHost(IPDwarf)) {
      setErrorTxt(
        "Already connected in Fleet. This telescope is now selected; open Dashboard or Camera.",
      );
      connectionCtx.setConnectionStatus(false);
      return;
    }

    if (IPDwarf == undefined) {
      return;
    }

    setConnecting(true);
    connectionCtx.setIPDwarf(IPDwarf);
    saveIPDwarfDB(IPDwarf);
    console.log(
      "Start connection with " + IPDwarf + " using ClientID: " + DwarfClientID,
    );
    console.log("Current ClientID: " + currentDwarfClientID);
    connectionHandler(
      connectionCtx,
      IPDwarf,
      true,
      setConnecting,
      setSlavemode,
      setGoLive,
      setErrorTxt,
    );
  }

  function ipHandler(e: ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.trim();
    if (value === "") return;
    console.log("ipHandler");
    setIpValue(value);
  }

  function renderConnectionStatus() {
    let goLiveMessage = "";
    if (goLive) {
      goLiveMessage = "=> Go Live";
    }
    if (connecting) {
      return <span className="text-warning-connect">{t("pConnecting")}</span>;
    }
    if (connectionCtx.connectionStatus === undefined) {
      return <></>;
    }
    if (connectionCtx.connectionStatus === false) {
      return (
        <span className="text-danger">
          {t("pConnectingFailed")}
          {errorTxt}.
        </span>
      );
    }
    if (connectionCtx.connectionStatusSlave || slavemode) {
      return (
        <span className="text-warning">
          {t("pConnectionSuccessFull")} (Slave Mode) {goLiveMessage}
          {errorTxt}.
        </span>
      );
    }

    return (
      <span className="text-success-connect">
        {t("pConnectionSuccessFull")} {goLiveMessage}
        {errorTxt}
      </span>
    );
  }

  const renderCmdHostLockDwarf = () => {
    // Your logic for rendering CmdHostLockDwarf
    // Example:
    return <CmdHostLockDwarf />;
  };

  function forceDisconnect() {
    if (connectionCtx.IPDwarf === undefined) {
      return;
    }

    const webSocketHandler = connectionCtx.socketIPDwarf
      ? connectionCtx.socketIPDwarf
      : new WebSocketHandler(connectionCtx.IPDwarf);

    // send command to Force Disconnect
    webSocketHandler.cleanup(true);
    saveIPConnectDB("");
    connectionCtx.setConnectionStatus(false);
  }

  function generateRandomDwarfID() {
    // Generate a random value between 0x00 and 0xFF (255 in decimal)
    const randomValue = Math.floor(Math.random() * 256); // 256 because Math.random() generates 0 to <1

    const randomHex = randomValue.toString(16).padStart(2, "0").toUpperCase();

    return DwarfClientID_base + randomHex;
  }

  function updateDwarfID() {
    const newRandomID = generateRandomDwarfID();
    setRandomDwarfClientID(newRandomID);
    setCurrentDwarfClientID(newRandomID);
    setDwarfClientID(newRandomID);
    console.log("New ClientID generated: " + newRandomID);
  }

  // Handle checkbox change
  const handleCheckboxChange = (event) => {
    const isChecked = event.target.checked;
    setIsChecked(isChecked);

    forceDisconnect();
    if (isChecked) {
      // If a random ID was already generated, use that. Otherwise, generate a new one
      if (!randomDwarfClientID) {
        updateDwarfID();
      } else {
        setCurrentDwarfClientID(randomDwarfClientID); // Use existing random ID
        setDwarfClientID(randomDwarfClientID);
      }
    } else {
      // Revert to the original DwarfClientID when unchecked
      setCurrentDwarfClientID(originalDwarfClientID.current); // Revert to original
      setDwarfClientID(originalDwarfClientID.current); // Restore original in the backend
    }
  };

  const handleRefresh = (event) => {
    event.preventDefault();

    if (isChecked) {
      forceDisconnect();
      updateDwarfID();
    }
  };

  const handleReset = (event) => {
    event.preventDefault();

    connectionCtx.setTypeIdDwarf(undefined);
    connectionCtx.setTypeNameDwarf("");
  };

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

  return (
    <div>
      <h2>
        {t("pConnectDwarfII", { DwarfType: connectionCtx.typeNameDwarf })}
      </h2>

      <p>
        {t("pConnectDwarfIIContent", {
          DwarfType: connectionCtx.typeNameDwarf,
        })}
      </p>

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
          <li className="mb-2">
            {t("pConnectDwarfIIContent1", {
              DwarfType: connectionCtx.typeNameDwarf,
            })}
          </li>
          <li className="mb-2">{t("pConnectDwarfIIContent2")}</li>
          <li className="mb-2">
            {t("pConnectDwarfIIContent3", {
              DwarfType: connectionCtx.typeNameDwarf,
            })}
          </li>
          <li className="mb-2">
            {t("pConnectDwarfIIContent4", {
              DwarfType: connectionCtx.typeNameDwarf,
            })}
          </li>
          <li className="mb-2">
            {t("pConnectDwarfIIContent5", {
              DwarfType: connectionCtx.typeNameDwarf,
            })}
          </li>
          <li className="mb-4">{t("pConnectDwarfIIContent6")}</li>
        </ol>
      )}
      <form onSubmit={checkConnection} className="mb-3 dw-connection-form">
        <div className="row mb-3">
          <div className="col-lg-2 col-md-3 text-lg-end">
            <span className="form-label">Device model</span>
          </div>
          <div className="col">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleReset}
              aria-label={t("pResetDwarfType")}
            >
              <i className="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>
              Redetect model
            </button>{" "}
            <span className="small ms-2">
              {connectionCtx.typeNameDwarf || "Not identified yet"}
            </span>
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-lg-2 col-md-3 text-lg-end">
            <label htmlFor="notify" className="form-label">
              Private client ID
            </label>
          </div>
          <div className="col">
            <input
              type="checkbox"
              id="notify"
              name="notify"
              checked={isChecked}
              onChange={(e) => handleCheckboxChange(e)}
            />{" "}
            <button
              type="button"
              className="btn btn-outline-secondary ms-2"
              onClick={handleRefresh}
              aria-label={t("pConnectPrivateID")}
            >
              <i className="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>
              Regenerate ID
            </button>
            <p className="small mt-2 mb-0">{t("pConnectPrivateID")}</p>
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-lg-2 col-md-3 text-lg-end">
            <label htmlFor="ip" className="form-label">
              {t("pIPAddress")}
            </label>
          </div>
          <div className="col-lg-6 col-md-9 d-flex align-items-center">
            <input
              className="form-control"
              id="ip"
              name="ip"
              placeholder="127.0.0.1"
              required
              value={ipValue}
              onChange={(e) => ipHandler(e)}
              disabled={ipAuto}
            />
          </div>
        </div>
        <div className="dw-connection-actions">
          <button type="submit" className="btn btn-more02">
            <i className="icon-wifi" /> {t("pConnect")}
          </button>
          {renderConnectionStatus()}
          {renderCmdHostLockDwarf()}
        </div>
      </form>
    </div>
  );
}
