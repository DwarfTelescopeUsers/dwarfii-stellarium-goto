/// <reference types="web-bluetooth" />
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import WifiProfiles from "./WifiProfiles";
import { useEffect, useContext, useState, useRef } from "react";
import type { ChangeEvent } from "react";
import type { FormEvent } from "react";
import {
  getProxyUrl,
  getServerIp,
  getServerUrl,
  checkHealth,
  isModeHttps,
  isLocalIp,
  checkMediaMtxStreamUrls,
  compareURLsIgnoringPort,
} from "@/lib/get_proxy_url";
import axios from "axios";
import { isTauri } from "@tauri-apps/api/core";
import {
  DwarfClientIdDwarfMini,
  DwarfDeviceIdDwarfMini,
  Dwarfii_Api,
  messageGetconfig,
  messageWifiSTA,
  analyzePacketBle,
} from "@/services/dwarf";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { useFleet } from "@/stores/FleetContext";
import {
  bleNameFromResult,
  rememberBleDevice,
} from "@/services/fleet/bleIdentity";
import {
  saveIPDwarfDB,
  saveBlePWDDwarfDB,
  saveBleSTASSIDDwarfDB,
  saveBleSTAPWDDwarfDB,
  saveProxyIPDB,
  saveProxyLocalIPDB,
} from "@/db/db_utils";

function getBluetoothErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotFoundError" && error.message.includes("cancelled")) {
      return "Bluetooth device selection was cancelled.";
    }
    if (error.name === "NotFoundError" && error.message.includes("Services")) {
      return "The selected device did not expose a supported DWARF Bluetooth service. Check its firmware and retry.";
    }
    if (error.name === "SecurityError") {
      return "Bluetooth access was blocked. Allow Bluetooth access and retry.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Bluetooth connection failed. Retry.";
}

export default function ConnectDwarfSTA() {
  let connectionCtx = useContext(ConnectionContext);
  const fleet = useFleet();

  const [showHelp, setShowHelp] = useState(false);
  const [onTauri, setOnTauri] = useState(false);
  const [savedProxyUrl, setSavedProxyUrl] = useState<string | undefined>("");
  const [proxyIpValue, setProxyIpValue] = useState("");
  const [proxyLocalIpValue, setProxyLocalIpValue] = useState("");
  const [proxyLocalIPs, setProxyLocalIPs] = useState<string[]>([]);
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [directBleBusy, setDirectBleBusy] = useState(false);
  const [findDwarfBluetooth, setFindDwarfBluetooth] = useState(false);
  const [etatBluetooth, setEtatBluetooth] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | undefined>(
    undefined,
  );
  const [errorTxt, setErrorTxt] = useState("");
  const [BluetoothPWD, setBluetoothPWD] = useState<string>(
    connectionCtx.BlePWDDwarf || "DWARF_12345678",
  );
  const [Wifi_SSID, setWifi_SSID] = useState<string>(
    connectionCtx.BleSTASSIDDwarf || "",
  );
  const [Wifi_PWD, setWifi_PWD] = useState<string>(
    connectionCtx.BleSTAPWDDwarf || "",
  );
  const [useDirectBluetooth, setUseDirectBluetooth] = useState(false);
  const [stateProxy, setStateProxy] = useState(false);
  const [stateBluetoothProxy, setStateBluetoothProxy] = useState(false);
  const [stateBluetoothServer, setStateBluetoothServer] = useState(false);
  const [stateMediaMtx, setStateMediaMtx] = useState(false);
  const [isProxyOnServer, setIsProxyOnServer] = useState(false);
  const [stateProxyInLan, setStateProxyInLan] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(""); // Debounced value
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  const saveBleIdentity = (name: string | undefined, host: string) => {
    if (!name || !host) return;
    rememberBleDevice(name, host);
    for (const device of Object.values(fleet.registry.getSnapshot().devices)) {
      if (
        device.lastKnownHost === host &&
        (!device.reportedName ||
          device.reportedName.toLowerCase() === name.toLowerCase())
      ) {
        fleet.registry.updateReportedName(device.id, name);
      }
    }
  };

  const handleInputPWDChange = (event) => {
    setBluetoothPWD(event.target.value);
  };
  const handleInputSSIDChange = (event) => {
    setWifi_SSID(event.target.value);
  };
  const handleInputWifiPWDChange = (event) => {
    setWifi_PWD(event.target.value);
  };
  const abortControllerRef = useRef<AbortController | null>(null);
  const abortControllerRef2 = useRef<AbortController | null>(null);

  // Debouncing logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(proxyIpValue); // Update debounced value after delay
    }, 1500);

    return () => {
      clearTimeout(handler); // Clear timeout on cleanup
    };
  }, [proxyIpValue]);

  let IsFirstStepOK = false;
  let configValue;
  let deviceDwarf;
  let deviceDwarfID;
  let deviceDwarfName;
  let characteristicDwarf;

  function button_progress() {
    document.body.style.cursor = "progress";
    const button1 = document.getElementById("btnWeb");
    if (button1) button1.classList.add("button-loading");

    const button2 = document.getElementById("btnDirect");
    if (button2) button2.classList.add("button-loading");
  }

  function button_default() {
    document.body.style.cursor = "default";
    const button1 = document.getElementById("btnWeb");
    if (button1) button1.classList.remove("button-loading");

    const button2 = document.getElementById("btnDirect");
    if (button2) button2.classList.remove("button-loading");
  }

  async function checkConnection(e: FormEvent<HTMLFormElement>) {
    button_progress();
    e.preventDefault();

    IsFirstStepOK = false;
    connectionCtx.setTypeIdDwarf(undefined);
    connectionCtx.setTypeNameDwarf("Dwarf");

    try {
      // Connecting
      setConnecting(true);
      setFindDwarfBluetooth(false);
      setEtatBluetooth(false);

      if (deviceDwarf) {
        // disconnect Bluetooth
        console.debug("disconnect already connected device");
        actionDisconnect();
      }

      const Dwarf_Characteristic_String =
        "00009999-0000-1000-8000-00805f9b34fb";
      const DwarfII_ID_String = "0000daf2-0000-1000-8000-00805f9b34fb";
      const Dwarf3_ID_String = "0000daf3-0000-1000-8000-00805f9b34fb";
      const DwarfMini_ID_String = DwarfClientIdDwarfMini.toLowerCase();
      const DwarfRegisteredServiceStrings = [
        DwarfII_ID_String,
        Dwarf3_ID_String,
        DwarfMini_ID_String,
        "0000daf5-0000-1000-8000-00805f9b34fb",
        "0000daf6-0000-1000-8000-00805f9b34fb",
        "000daf07-0000-1000-8000-00805f9b34fb",
      ];

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "DWARF" }],
        optionalServices: DwarfRegisteredServiceStrings,
      });

      if (device) {
        deviceDwarf = device;
        // Add the new class
        setFindDwarfBluetooth(true);
        setErrorTxt(deviceDwarf.name);
        console.debug("Got device:", deviceDwarf.name);
        console.debug("id:", deviceDwarf.id);
        deviceDwarf.addEventListener("gattserverdisconnected", onDisconnected);

        if (!deviceDwarf.gatt) throw new Error("Can't get bluetooth gatt ");
        else console.debug("gatt:", deviceDwarf.gatt);

        const server = await deviceDwarf.gatt.connect();
        if (!server) throw new Error("Can't get gatt bluetooth service");
        else console.debug("Got bluetooth connected");

        const primaryServices = await server.getPrimaryServices();
        console.info(
          "Authorized DWARF Bluetooth services:",
          primaryServices.map((candidate) => candidate.uuid),
        );

        let service: BluetoothRemoteGATTService | undefined;
        for (const candidate of primaryServices) {
          try {
            characteristicDwarf = await candidate.getCharacteristic(
              Dwarf_Characteristic_String,
            );
            service = candidate;
            break;
          } catch (error) {
            if (
              !(error instanceof DOMException) ||
              error.name !== "NotFoundError"
            ) {
              throw error;
            }
          }
        }

        if (!service) {
          throw new Error(
            "The selected device does not expose the DWARF provisioning characteristic.",
          );
        }

        const serviceUuid = service.uuid.toLowerCase();
        const advertisedName = deviceDwarf.name?.toUpperCase() ?? "";
        if (
          advertisedName.includes("MINI") ||
          serviceUuid === DwarfMini_ID_String
        ) {
          deviceDwarfID = DwarfDeviceIdDwarfMini;
          deviceDwarfName = "DWARF mini";
        } else if (serviceUuid === DwarfII_ID_String) {
          deviceDwarfID = 1;
          deviceDwarfName = "DWARF II";
        } else if (serviceUuid === Dwarf3_ID_String) {
          deviceDwarfID = 2;
          deviceDwarfName = "DWARF 3";
        } else {
          throw new Error(
            `Unsupported DWARF Bluetooth service ${service.uuid}.`,
          );
        }

        console.log(
          "########## Bluetooth connected to " +
            deviceDwarfName +
            " ##########",
        );

        console.debug("Got bluetooth service:", service.uuid);

        if (!characteristicDwarf)
          throw new Error("Can't get bluetooth characteristic");
        console.debug("Got characteristic:", characteristicDwarf.uuid);
        console.debug("Got characteristic:", characteristicDwarf.service);
        console.debug(characteristicDwarf);
        setEtatBluetooth(true);

        characteristicDwarf.addEventListener(
          "characteristicvaluechanged",
          handleValueChanged,
        );
        await characteristicDwarf.startNotifications();

        const data_test = await characteristicDwarf.readValue();
        console.debug("Got detail characteristic:", data_test);
        console.debug(data_test);

        // get Wifi
        let bufferGetConfig = messageGetconfig(BluetoothPWD);

        await characteristicDwarf.writeValue(bufferGetConfig);
      }
    } catch (error) {
      // Add the new class
      setErrorTxt(getBluetoothErrorMessage(error));
      console.error(error);
      setConnecting(false);
      setConnectionStatus(false);
    } finally {
      button_default();
    }
  }

  async function handleValueChanged(event) {
    try {
      let value = event.target.value;
      console.log("########## New Value Received ##########");
      console.debug("Value changed:", value);
      console.debug("IsFirstStepOK:", IsFirstStepOK);
      console.debug("##########");

      let bufferReadConfig;
      configValue = "";

      if (value) {
        // Convert the received value to a buffer
        bufferReadConfig = new Uint8Array(value.buffer);
        console.log("Buffer:", bufferReadConfig);

        // check buffer and get configValue
        if (bufferReadConfig.length >= 12) {
          // Short BLE notification fragments do not contain a complete frame.
          configValue = analyzePacketBle(bufferReadConfig, false);
          console.log("Read:", configValue);
        }
      }
      if (!IsFirstStepOK && configValue) {
        let result_data = JSON.parse(configValue);

        if (result_data.cmd === undefined || result_data.cmd != 1) {
          console.log("Ignore Frame Received: cmd=", result_data.cmd);
        } else if (result_data.code && result_data.code != 0) {
          setErrorTxt(
            "Error get Config:" +
              result_data.code +
              " (" +
              Dwarfii_Api.DwarfBleErrorCode[result_data.code] +
              ")",
          );
          setConnecting(false);
          setConnectionStatus(false);
          actionDisconnect();
        } else if (result_data.state == 0 && Wifi_SSID && Wifi_PWD) {
          setErrorTxt("Load WiFi configuration...");
          IsFirstStepOK = true;
          let bufferSetWifiSta = messageWifiSTA(
            1,
            BluetoothPWD,
            Wifi_SSID,
            Wifi_PWD,
          );
          await characteristicDwarf.writeValue(bufferSetWifiSta);
        } else if (result_data.state != 2) {
          setErrorTxt(
            "Error WiFi configuration not Completed! Restart it and Use the mobile App.",
          );
          setConnecting(false);
          setConnectionStatus(false);
          actionDisconnect();
        } else if (result_data.wifiMode != 2) {
          setErrorTxt(
            "Error STA MODE not Configured! Restart it and Use the mobile App.",
          );
          setConnecting(false);
          setConnectionStatus(false);
          actionDisconnect();
        } else if (
          (result_data.ip == "192.168.88.1" ||
            result_data.ssid.startsWith("DWARF3_")) &&
          Wifi_SSID &&
          Wifi_PWD
        ) {
          setErrorTxt("Load WiFi configuration...");
          IsFirstStepOK = true;
          let bufferSetWifiSta = messageWifiSTA(
            0,
            BluetoothPWD,
            Wifi_SSID,
            Wifi_PWD,
          );
          await characteristicDwarf.writeValue(bufferSetWifiSta);
        } else if (
          result_data.ssid &&
          result_data.psd &&
          connectionCtx.BleSTASSIDDwarf &&
          connectionCtx.BleSTAPWDDwarf
        ) {
          setErrorTxt("Load WiFi configuration...");
          IsFirstStepOK = true;
          let bufferSetWifiSta = messageWifiSTA(
            0,
            BluetoothPWD,
            connectionCtx.BleSTASSIDDwarf,
            connectionCtx.BleSTAPWDDwarf,
          );
          await characteristicDwarf.writeValue(bufferSetWifiSta);
        } else {
          IsFirstStepOK = true;
          let bufferSetWifiSta = messageWifiSTA(
            0,
            BluetoothPWD,
            result_data.ssid,
            result_data.psd,
          );
          await characteristicDwarf.writeValue(bufferSetWifiSta);
        }
      } else if (IsFirstStepOK && configValue) {
        IsFirstStepOK = false;
        let result_data = JSON.parse(configValue);

        if (result_data.cmd === undefined || result_data.cmd != 3) {
          console.log("Ignore Frame Received: cmd=", result_data.cmd);
        } else if (result_data.code && result_data.code != 0) {
          setErrorTxt(
            "Error set WifiSTA:" +
              result_data.code +
              " (" +
              Dwarfii_Api.DwarfBleErrorCode[result_data.code] +
              ")",
          );
          setConnecting(false);
          setConnectionStatus(false);
          actionDisconnect();
        } else {
          console.log("Connected with IP: ", result_data.ip);
          setErrorTxt(" IP: " + result_data.ip);

          if (connectionCtx.IPDwarf != result_data.ip) {
            if (connectionCtx.socketIPDwarf) {
              connectionCtx.socketIPDwarf.close();
            }
          }
          connectionCtx.setIPDwarf(result_data.ip);
          saveIPDwarfDB(result_data.ip);
          saveBleIdentity(deviceDwarf?.name, result_data.ip);
          connectionCtx.setBlePWDDwarf(BluetoothPWD);
          saveBlePWDDwarfDB(BluetoothPWD);
          connectionCtx.setBleSTASSIDDwarf(result_data.ssid);
          saveBleSTASSIDDwarfDB(result_data.ssid);
          connectionCtx.setBleSTAPWDDwarf(result_data.psd);
          saveBleSTAPWDDwarfDB(result_data.psd);

          connectionCtx.setTypeIdDwarf(deviceDwarfID);
          connectionCtx.setTypeNameDwarf(deviceDwarfName);

          setConnecting(false);
          setConnectionStatus(true);
          await characteristicDwarf.stopNotifications();
          characteristicDwarf.removeEventListener(
            "characteristicvaluechanged",
            handleValueChanged,
          );
        }
      }
    } catch (error) {
      setErrorTxt(getBluetoothErrorMessage(error));
      console.error(error);
      setConnecting(false);
      setConnectionStatus(false);
      actionDisconnect();
    } finally {
      button_default();
    }
  }

  function onDisconnected() {
    console.log("> Bluetooth Device disconnected");
    setConnectionStatus(false);
    button_default();
  }

  async function actionDisconnect() {
    try {
      // disconnect Bluetooth
      if (characteristicDwarf) {
        await characteristicDwarf.stopNotifications();
        characteristicDwarf.removeEventListener(
          "characteristicvaluechanged",
          handleValueChanged,
        );
      }
      if (deviceDwarf) {
        deviceDwarf.removeEventListener(
          "gattserverdisconnected",
          onDisconnected,
        );
        if (deviceDwarf.gatt) await deviceDwarf.gatt.disconnect();
      }
    } catch (error) {
      console.error(error);
    } finally {
      button_default();
    }
  }

  function renderConnectionStatus() {
    if (connecting) {
      return <span>{t("pConnecting")}</span>;
    }
    if (findDwarfBluetooth && connectionStatus === undefined) {
      return <span className="text-warning-connect">Found {errorTxt}.</span>;
    }
    if (etatBluetooth && connectionStatus === undefined) {
      return (
        <span className="text-warning-connect">
          Connected to Dwarf Device
          {errorTxt}.
        </span>
      );
    }
    if (devices?.length > 0) {
      return <span className="text-warning-connect">{errorTxt}.</span>;
    }
    if (connectionStatus === undefined) {
      return <></>;
    }
    if (connectionStatus === false) {
      return (
        <span className="text-danger-connect">
          {t("pConnectingFailed")} {errorTxt}
        </span>
      );
    }

    return (
      <span className="text-success-connect">
        {t("pConnectionSuccessFull")}
        {errorTxt}
      </span>
    );
  }
  const { t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    }
    setBluetoothPWD(connectionCtx.BlePWDDwarf || "DWARF_12345678");
    setWifi_SSID(connectionCtx.BleSTASSIDDwarf || "");
    setWifi_PWD(connectionCtx.BleSTAPWDDwarf || "");
  }, []);

  useEffect(() => {
    console.log("Effect triggered, aborting previous request if exists...");
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Abort the previous request
    }
    abortControllerRef.current = new AbortController(); // Create a new one
    const signal = abortControllerRef.current.signal;

    // Test Proxy
    const getProxyLocalIP = async (proxyUrl, signal) => {
      if (!proxyUrl) {
        setProxyLocalIPs([]);
        return;
      }
      // Fetch local IPs from the backend
      const urlProxyRequest = proxyUrl?.includes("api")
        ? "/api/getLocalIP"
        : proxyUrl + "/getLocalIP";
      try {
        const response = await axios.get(urlProxyRequest, { signal });
        const ipList = response.data.ips;
        setProxyLocalIPs(ipList);
        if (
          connectionCtx?.proxyLocalIP &&
          !ipList.includes(connectionCtx.proxyLocalIP)
        )
          ipList.push(connectionCtx.proxyLocalIP);
        // If there's a saved IP in context, use it (even if it's not in the list)
        if (connectionCtx?.proxyLocalIP) {
          setProxyLocalIpValue(connectionCtx.proxyLocalIP);
        } else {
          setProxyLocalIpValue(ipList[0]); // Default to first available IP
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (signal.aborted) {
            console.log("Request aborted: getProxyLocalIP");
          } else {
            console.error("Error fetching local IPs: ", error);
          }
        } else {
          console.error("An unknown error occurred:", error);
        }
        const ipList: string[] = [];
        if (connectionCtx?.proxyLocalIP) {
          ipList.push(connectionCtx.proxyLocalIP);
          setProxyLocalIPs(ipList);
          setProxyLocalIpValue(connectionCtx.proxyLocalIP);
        }
      }
    };

    const checkProxyStatus = async (signal: AbortSignal) => {
      let proxyUrl = getProxyUrl(connectionCtx);
      setSavedProxyUrl(proxyUrl);

      let serverUrl = getServerUrl();
      let isHttps = isModeHttps();
      connectionCtx.setUseHttps(isHttps);

      try {
        setStateMediaMtx(
          await checkMediaMtxStreamUrls(connectionCtx, 3000, signal),
        );

        if (connectionCtx.proxyIP) setProxyIpValue(connectionCtx.proxyIP);

        if (proxyUrl && proxyUrl.includes("api")) {
          // Run health checks in parallel, passing the signal
          const [statusProxy, statusBluetoothServer] = await Promise.all([
            checkHealth("/api/health", 3000, signal),
            checkHealth("/api/run-ble-health", 3000, signal),
          ]);

          setIsProxyOnServer(true);
          setStateProxy(statusProxy);

          if (statusProxy) {
            const serverIp = getServerIp();
            if (serverIp) {
              connectionCtx.setProxyInLan(isLocalIp(serverIp));
              setStateProxyInLan(isLocalIp(serverIp));
              console.log("ProxyInLan:", isLocalIp(serverIp));
            }
            await getProxyLocalIP(proxyUrl, signal);
          }

          if (statusProxy && statusBluetoothServer) {
            setStateBluetoothProxy(true);
            setStateBluetoothServer(true);
            setUseDirectBluetooth(true);
            connectionCtx.setUseDirectBluetoothServer(true);
          } else {
            setStateBluetoothProxy(false);
            setStateBluetoothServer(false);
            setUseDirectBluetooth(false);
            connectionCtx.setUseDirectBluetoothServer(false);
          }
        } else {
          let sameProxyServer = compareURLsIgnoringPort(proxyUrl, serverUrl);

          // Run health checks in parallel, passing the signal
          const [statusProxy, statusBluetoothProxy, statusBluetoothServer] =
            await Promise.all([
              checkHealth(proxyUrl + "/health", 3000, signal),
              checkHealth(proxyUrl + "/run-ble-health", 3000, signal),
              isTauri()
                ? Promise.resolve(false)
                : checkHealth(serverUrl + "/run-ble-health", 3000, signal),
            ]);

          setIsProxyOnServer(sameProxyServer);
          setStateProxy(statusProxy);

          if (statusProxy) {
            if (
              connectionCtx?.proxyIP &&
              (!connectionCtx?.proxyLocalIP ||
                connectionCtx?.proxyIP == connectionCtx?.proxyLocalIP) &&
              isLocalIp(connectionCtx?.proxyIP)
            ) {
              connectionCtx.setProxyInLan(true);
              setStateProxyInLan(true);
            } else if (connectionCtx?.proxyIP && connectionCtx?.proxyLocalIP) {
              const proxyLocalUrl = proxyUrl?.replace(
                connectionCtx.proxyIP,
                connectionCtx.proxyLocalIP,
              );
              console.log("proxyLocalUrl:", proxyLocalUrl);
              let statusLocalProxy = await checkHealth(
                proxyLocalUrl + "/health",
                3000,
                signal,
              );
              console.log("statusLocalProxy:", statusLocalProxy);
              connectionCtx.setProxyInLan(statusLocalProxy);
              setStateProxyInLan(statusLocalProxy);
            }
            await getProxyLocalIP(proxyUrl, signal);
          }

          setStateBluetoothServer(false);
          setStateBluetoothProxy(false);
          setUseDirectBluetooth(false);

          if (statusProxy && statusBluetoothProxy) {
            setStateBluetoothProxy(true);
            setUseDirectBluetooth(true);
          }
          if (statusBluetoothServer) {
            setStateBluetoothServer(true);
            setUseDirectBluetooth(true);
          }

          connectionCtx.setUseDirectBluetoothServer(
            statusBluetoothServer && !statusBluetoothProxy,
          );
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (signal.aborted) {
            console.log("checkProxyStatus aborted due to new request.");
          } else {
            console.error("Error in checkProxyStatus:", error);
          }
        } else {
          console.error("An unknown error occurred:", error);
        }
      }
    };

    if (isTauri()) {
      setOnTauri(true);
      connectionCtx?.setProxyInLan(true);
      setStateProxyInLan(true);
    }
    void checkProxyStatus(signal);
    return () => {
      console.log("Cleanup: Aborting previous checkProxyStatus call");
      abortControllerRef.current?.abort();
    };
  }, [connectionCtx.proxyIP]);

  useEffect(() => {
    console.log("Effect 2 triggered, aborting previous request if exists...");
    if (abortControllerRef2.current) {
      abortControllerRef2.current.abort(); // Abort the previous request
    }
    abortControllerRef2.current = new AbortController(); // Create a new one
    const signal = abortControllerRef2.current.signal;

    const checkLocalProxyStatus = async (signal: AbortSignal) => {
      let proxyUrl = getProxyUrl(connectionCtx);
      setSavedProxyUrl(proxyUrl);

      try {
        if (stateProxy) {
          if (
            connectionCtx?.proxyIP &&
            (!connectionCtx?.proxyLocalIP ||
              connectionCtx?.proxyIP == connectionCtx?.proxyLocalIP) &&
            isLocalIp(connectionCtx?.proxyIP)
          ) {
            connectionCtx.setProxyInLan(true);
            setStateProxyInLan(true);
          } else if (connectionCtx?.proxyIP && connectionCtx?.proxyLocalIP) {
            const proxyLocalUrl = proxyUrl?.replace(
              connectionCtx.proxyIP,
              connectionCtx.proxyLocalIP,
            );
            console.log("proxyLocalUrl:", proxyLocalUrl);
            let statusLocalProxy = await checkHealth(
              proxyLocalUrl + "/health",
              3000,
              signal,
            );
            console.log("statusLocalProxy:", statusLocalProxy);
            connectionCtx.setProxyInLan(statusLocalProxy);
            setStateProxyInLan(statusLocalProxy);
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (signal.aborted) {
            console.log("checkProxyStatus aborted due to new request.");
          } else {
            console.error("Error in checkProxyStatus:", error);
          }
        } else {
          console.error("An unknown error occurred:", error);
        }
      }
    };

    if (isTauri()) {
      setOnTauri(true);
      connectionCtx?.setProxyInLan(true);
      setStateProxyInLan(true);
    } else {
      checkLocalProxyStatus(signal);
    }
    return () => {
      console.log("Cleanup: Aborting previous checkProxyLocalStatus call");
      abortControllerRef2.current?.abort();
    };
  }, [connectionCtx.proxyLocalIP]);

  // Handle checkbox change
  const handleCheckboxBleServerChange = (event) => {
    const isChecked = event.target.checked;
    connectionCtx.setUseDirectBluetoothServer(isChecked);
  };

  const refreshProxyLocalIP = async (proxyIP) => {
    if (!proxyIP) {
      setProxyLocalIPs([]);
      return;
    }
    console.log("refreshProxyLocalIP");

    // Fetch local IPs from the backend
    const protocol = connectionCtx.useHttps ? "https:" : "http:";
    const port = connectionCtx.useHttps
      ? process.env.NEXT_PUBLIC_PORT_PROXY_CORS_HTTPS
      : process.env.NEXT_PUBLIC_PORT_PROXY_CORS;
    const urlProxyRequest = `${protocol}//${proxyIP}:${port}/getLocalIP`;
    console.log("refreshProxyLocalIP", urlProxyRequest);
    axios
      .get(urlProxyRequest)
      .then((response) => {
        const ipList = response.data.ips;
        console.log("refreshProxyLocalIP", ipList);
        if (
          connectionCtx?.proxyLocalIP &&
          !ipList.includes(connectionCtx.proxyLocalIP)
        ) {
          ipList.push(connectionCtx.proxyLocalIP);
        }
        // If there's a saved IP in context, use it (even if it's not in the list)
        setProxyLocalIPs(ipList);
        if (connectionCtx?.proxyLocalIP) {
          setProxyLocalIpValue(connectionCtx.proxyLocalIP);
        } else {
          setProxyLocalIpValue(ipList[0]); // Default to first available IP
        }
      })
      .catch((error) => {
        console.error("Error fetching local IPs:", error);
        const ipList: string[] = [];
        if (connectionCtx?.proxyLocalIP) {
          ipList.push(connectionCtx.proxyLocalIP);
          setProxyLocalIPs(ipList);
          setProxyLocalIpValue(connectionCtx.proxyLocalIP);
        }
      });
  };

  function isValidIP(ip) {
    if (typeof ip !== "string") return false;

    // Regular expression for IPv4
    const ipv4Regex =
      /^(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)$/;

    // Regular expression for IPv6
    const ipv6Regex =
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9]))$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  // Trigger logic when the debounced value changes
  useEffect(() => {
    if (debouncedValue !== "") {
      if (isValidIP(debouncedValue)) {
        setProxyLocalIPs([]);
        setProxyLocalIpValue("");
        refreshProxyLocalIP(debouncedValue);
      }
    }
  }, [debouncedValue]);

  function ipHandler(e: ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.trim();
    if (value === "") return;
    console.log("ipHandler");
    setProxyIpValue(value);
  }

  function ChangeProxy() {
    connectionCtx.setProxyIP(proxyIpValue);
    connectionCtx.setProxyLocalIP(proxyLocalIpValue);
    saveProxyIPDB(proxyIpValue);
    saveProxyLocalIPDB(proxyLocalIpValue);
  }

  function ResetProxy() {
    setProxyIpValue("");
    connectionCtx.setProxyIP("");
    saveProxyIPDB("");
    setProxyLocalIpValue("");
    connectionCtx.setProxyLocalIP("");
    saveProxyLocalIPDB("");
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      // Add the custom IP to the list if it's not empty and doesn't already exist
      if (
        proxyLocalIpValue &&
        isValidIP(proxyLocalIpValue) &&
        !proxyLocalIPs.includes(proxyLocalIpValue)
      ) {
        setProxyLocalIPs([...proxyLocalIPs, proxyLocalIpValue]);
      }
      setIsCustomInput(false); // Close the input field when Enter is pressed
    }
  };

  const runExecutable = async () => {
    setDirectBleBusy(true);
    button_progress();
    // Get the Bluetooth password from the input field
    // Old Get
    //const pwd_data = encodeURIComponent(BluetoothPWD);
    //const ssid_data = encodeURIComponent(Wifi_SSID);
    //const wifipwd_data = encodeURIComponent(Wifi_PWD);
    //const auto_select = selectedDevice
    //  ? `&auto_select=${selectedDevice}`
    //  : "&auto_select=0";
    //const requestCmdGet =
    //  `/run-ble?ble_psd=${pwd_data}&ble_STA_ssid=${ssid_data}&ble_STA_pwd=${wifipwd_data}` +
    //  auto_select;

    const auto_select_value = selectedDevice ? selectedDevice : "0";
    setSelectedDevice(""); // Reset Device
    const requestCmd = `/run-ble`;
    const requestBody = {
      ble_psd: BluetoothPWD,
      ble_STA_ssid: Wifi_SSID,
      ble_STA_pwd: Wifi_PWD,
      auto_select: auto_select_value,
    };
    let proxyUrl = savedProxyUrl;
    let directProxyUrl = "";
    console.log("savedProxyUrl:", proxyUrl);

    if (!proxyUrl) {
      console.error("runExecutable proxyUrl empty");
      button_default();
      setConnecting(false);
      setConnectionStatus(false);
      setErrorTxt(
        "Bluetooth service is unavailable. Check the local proxy and retry.",
      );
      setDirectBleBusy(false);
      return;
    } else if (proxyUrl?.includes("api")) {
      proxyUrl = "/api" + requestCmd;
    } else if (
      connectionCtx.useDirectBluetoothServer &&
      getServerUrl().includes("api")
    ) {
      proxyUrl = getServerUrl() + requestCmd;
    } else if (connectionCtx.useDirectBluetoothServer && isProxyOnServer) {
      proxyUrl = getServerUrl() + requestCmd;
    } else {
      const requestAddr = getServerUrl() + requestCmd;
      proxyUrl = `${savedProxyUrl}?target=${encodeURIComponent(requestAddr)}`;
      console.log("proxyUrl:", proxyUrl);
      //direct proxy request
      directProxyUrl = `${savedProxyUrl}${requestCmd}`;
      console.log("directProxyUrl:", directProxyUrl);

      if (!connectionCtx.useDirectBluetoothServer) proxyUrl = directProxyUrl;
      console.log("Call Bluetooth Url:", proxyUrl);
    }
    setConnecting(true);

    try {
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Use 'application/json' for JSON
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120000),
        redirect: "follow",
      });

      if (response.status === 401) {
        const result = await response.json().catch(() => null);
        console.error("runExecutable: device rejected the BLE setup", result);
        setConnecting(false);
        setConnectionStatus(false);
        setErrorTxt(
          "Device found, but setup failed. Check the Bluetooth and Wi-Fi passwords.",
        );
        return;
      }

      // Check if the response has data
      if (response.ok) {
        console.log(`runExecutable: status ${response.status}`);
        if (response.ok && response.status === 200) {
          console.log(`runExecutable: waitdata`);
          const result = await response.json();
          console.log(`runExecutable: getdata ${JSON.stringify(result)}`);

          if (result.error) console.error(`runExecutable: ${result.error}`);

          if (result && result.dwarfIp) {
            console.log(`runExecutable: data ${result.dwarfId}`);
            if (result.dwarfIp && result.dwarfIp != "None") {
              if (result.dwarfId == "1") {
                deviceDwarfID = result.dwarfId;
                deviceDwarfName = "Dwarf II";
              } else if (result.dwarfId == "2") {
                deviceDwarfID = 2;
                deviceDwarfName = "DWARF 3";
              } else if (result.dwarfId == String(DwarfDeviceIdDwarfMini)) {
                deviceDwarfID = DwarfDeviceIdDwarfMini;
                deviceDwarfName = "DWARF mini";
              }
              console.log("Connected with IP: ", result.dwarfIp);
              setErrorTxt(" IP: " + result.dwarfIp);

              if (connectionCtx.IPDwarf != result.dwarfIp) {
                if (connectionCtx.socketIPDwarf) {
                  connectionCtx.socketIPDwarf.close();
                }
              }
              connectionCtx.setIPDwarf(result.dwarfIp);
              saveIPDwarfDB(result.dwarfIp);
              saveBleIdentity(
                bleNameFromResult(result.details) ||
                  (auto_select_value !== "0" ? auto_select_value : undefined),
                result.dwarfIp,
              );
              connectionCtx.setBlePWDDwarf(BluetoothPWD);
              saveBlePWDDwarfDB(BluetoothPWD);
              connectionCtx.setBleSTASSIDDwarf(Wifi_SSID);
              saveBleSTASSIDDwarfDB(Wifi_SSID);
              connectionCtx.setBleSTAPWDDwarf(Wifi_PWD);
              saveBleSTAPWDDwarfDB(Wifi_PWD);
              connectionCtx.setTypeIdDwarf(deviceDwarfID);
              connectionCtx.setTypeNameDwarf(deviceDwarfName);
              setConnecting(false);
              setConnectionStatus(true);
            } else if (result.dwarfIp && result.dwarfIp == "None") {
              if (
                result.dwarfId == "1" ||
                result.dwarfId == "2" ||
                result.dwarfId == String(DwarfDeviceIdDwarfMini)
              ) {
                console.log(`runExecutable: device Found but error`);
                setConnecting(false);
                setConnectionStatus(false);
                setErrorTxt(
                  "Device Found with Error, check Password and Retry ...",
                );
              } else {
                console.log(`runExecutable: No device Found`);
                setConnecting(false);
                setConnectionStatus(false);
                setErrorTxt("No device Found!");
              }
            } else {
              setConnecting(false);
              setConnectionStatus(false);
              setErrorTxt("Error, Retry...");
            }
          } else {
            setConnecting(false);
            setConnectionStatus(false);
            setErrorTxt("Error, Retry...");
          }
        } else if (response.ok && response.status === 204) {
          console.log(`runExecutable: No device Found`);
          setConnecting(false);
          setConnectionStatus(false);
          setErrorTxt("No device Found!");
        } else if (response.ok && response.status === 202) {
          const result = await response.json();
          console.log(
            `runExecutable: Select device in ${JSON.stringify(result)}`,
          );
          if (result.devices) {
            setDevices(result.devices);
          }
          setConnecting(false);
          setErrorTxt("More than one device found, Select one");
        } else {
          console.error(`runExecutable: ${JSON.stringify(response)}`);
          setConnecting(false);
          setConnectionStatus(false);
          setErrorTxt("Error, Retry...");
        }
      } else {
        console.error(`runExecutable: ${JSON.stringify(response)}`);
        setErrorTxt("Error, Retry...");
        setConnecting(false);
        setConnectionStatus(false);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error("Request timed out!");
        setErrorTxt("Error Timeout, Retry...");
        setConnecting(false);
        setConnectionStatus(false);
      } else {
        console.error("Fetch error:", error.message);
        setErrorTxt("Error, Retry...");
        setConnecting(false);
        setConnectionStatus(false);
      }
    } finally {
      setDirectBleBusy(false);
      button_default();
    }
  };

  const handleSelect = (e) => {
    if (selectedDevice) {
      runExecutable();
      setDevices([]);
    }
    e.preventDefault(); // Prevents any unintended form submission
  };

  return (
    <div>
      {!onTauri && (
        <details className="dw-proxy-settings">
          <summary>Advanced: proxy and video services</summary>
          <h2>{t("pServerStatus")}</h2>

          <p>{t("pServerStatusContent")}</p>
          <p>
            {t("pServerStatusContent1")}
            <br />
            {t("pServerStatusContent2")}
          </p>
          <div className="row mb-3">
            {stateProxy == true && (
              <div className="col-lg-10 col-md-10">
                <i
                  className="bi bi-check-circle"
                  style={{ color: "green" }}
                ></i>
                {savedProxyUrl && savedProxyUrl.includes("api") && (
                  <span> {t("pProxyRunningLocally")}</span>
                )}
                {isProxyOnServer &&
                  savedProxyUrl &&
                  !savedProxyUrl.includes("api") && (
                    <span>
                      {" "}
                      {t("pProxyRunningOnServer")} {savedProxyUrl}
                    </span>
                  )}
                {!isProxyOnServer &&
                  savedProxyUrl &&
                  !savedProxyUrl.includes("api") && (
                    <span>
                      {" "}
                      {t("pProxyRunning")} {savedProxyUrl}
                    </span>
                  )}
              </div>
            )}
            {stateProxy == false && (
              <div className="col-lg-10 col-md-10">
                <i className="bi bi-x-circle" style={{ color: "red" }}></i>
                <span>
                  {" "}
                  {t("pProxyNotRunning")} {savedProxyUrl}
                </span>
              </div>
            )}
            {stateMediaMtx == true && (
              <div className="row mb-3">
                <div className="col-lg-10 col-md-10">
                  <i
                    className="bi bi-check-circle"
                    style={{ color: "green" }}
                  ></i>
                  <span> {t("pMediaMtxRunning")}</span>
                  {!stateProxyInLan && (
                    <>
                      <br />
                      <i
                        className="bi bi bi-exclamation-circle"
                        style={{ color: "orange" }}
                      ></i>
                      <span> {t("pMediaMtxNeedOpenPort8888")}</span>
                    </>
                  )}
                </div>
              </div>
            )}
            {stateMediaMtx == false && (
              <div className="row mb-3">
                <div className="col-lg-10 col-md-10">
                  <i className="bi bi-x-circle" style={{ color: "red" }}></i>
                  <span> {t("pMediaMtxNotRunning")}</span>
                </div>
              </div>
            )}
            {!isProxyOnServer && stateBluetoothProxy == true && (
              <div className="row mb-3">
                <div className="col-lg-10 col-md-10">
                  <i
                    className="bi bi-check-circle"
                    style={{ color: "green" }}
                  ></i>
                  <span> {t("pDirecBluetoothProxyAvailable")}</span>
                </div>
              </div>
            )}
            {!isProxyOnServer && stateBluetoothProxy == false && (
              <div className="row mb-3">
                <div className="col-lg-10 col-md-10">
                  <i className="bi bi-x-circle" style={{ color: "red" }}></i>
                  <span>{t("pDirecBluetoothProxyNotAvailable")}</span>
                </div>
              </div>
            )}
            {!onTauri && !isProxyOnServer && stateBluetoothServer == true && (
              <div className="row mb-3">
                <div className="col-lg-10 col-md-10">
                  <i
                    className="bi bi-check-circle"
                    style={{ color: "green" }}
                  ></i>
                  <span> {t("pDirecBluetoothServerAvailable")}</span>
                </div>
              </div>
            )}
            {!onTauri && !isProxyOnServer && stateBluetoothServer == false && (
              <div className="row mb-3">
                <div className="col-lg-10 col-md-10">
                  <i className="bi bi-x-circle" style={{ color: "red" }}></i>
                  <span> {t("pDirecBluetoothServerNotAvailable")}</span>
                </div>
              </div>
            )}
            {isProxyOnServer &&
              (stateBluetoothProxy || stateBluetoothServer) && (
                <div className="row mb-3">
                  <div className="col-lg-10 col-md-10">
                    <i
                      className="bi bi-check-circle"
                      style={{ color: "green" }}
                    ></i>
                    <span> {t("pDirecBluetoothServerAvailable")}</span>
                  </div>
                </div>
              )}
            {isProxyOnServer &&
              stateBluetoothProxy == false &&
              stateBluetoothServer == false && (
                <div className="row mb-3">
                  <div className="col-lg-10 col-md-10">
                    <i className="bi bi-x-circle" style={{ color: "red" }}></i>
                    <span> {t("pDirecBluetoothServerNotAvailable")}</span>
                  </div>
                </div>
              )}
            {savedProxyUrl && (
              <>
                <p>{t("pServerStatusContent3")}</p>
                <div className="row mb-3">
                  {/* Proxy IP Label */}
                  <div className="col-lg-2 col-md-3 text-lg-end">
                    <label htmlFor="proxyIp" className="form-label">
                      {t("pProxyIP")}
                    </label>
                  </div>

                  {/* Proxy IP Input */}
                  <div className="col-lg-3 col-md-10  d-flex align-items-center">
                    <input
                      className="form-control"
                      id="proxyIp"
                      name="proxyIp"
                      placeholder="127.0.0.1"
                      value={proxyIpValue}
                      onChange={(e) => ipHandler(e)}
                    />
                    {/* Proxy IP Status Icon */}
                    {proxyIpValue === connectionCtx.proxyIP ? (
                      <i
                        className="ms-3 bi bi-check-circle text-success"
                        title={t("cProxyIPSaved")}
                      ></i>
                    ) : (
                      <i
                        className="ms-3 bi bi-exclamation-triangle text-warning"
                        title={t("cProxyIPNotSaved")}
                      ></i>
                    )}
                  </div>

                  {/* Local IP Label */}
                  <div className="col-lg-2 col-md-3 text-lg-end">
                    <label htmlFor="proxyLocalIp">{t("pProxyLocalIP")}</label>
                  </div>

                  <div className="col-lg-4 col-md-10 d-flex align-items-center">
                    <select
                      className="form-control"
                      id="proxyLocalIp"
                      name="proxyLocalIp"
                      value={isCustomInput ? "custom" : proxyLocalIpValue}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          setIsCustomInput(true);
                          setProxyLocalIpValue(""); // Allow manual input
                        } else {
                          setIsCustomInput(false);
                          setProxyLocalIpValue(e.target.value);
                        }
                      }}
                    >
                      {/* Render IPs if available, otherwise only show "custom" */}
                      {proxyLocalIPs.length > 0 ? (
                        proxyLocalIPs.map((ip) => (
                          <option key={ip} value={ip}>
                            {ip}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          No available IPs
                        </option>
                      )}
                      <option value="custom">
                        {t("pProxyLocalEnterManually")}
                      </option>
                    </select>{" "}
                    {/* Show input field if "custom" is selected */}
                    {isCustomInput && (
                      <input
                        className="form-control ms-4"
                        type="text"
                        placeholder={t("pProxyLocalCustomIP")}
                        value={proxyLocalIpValue}
                        onChange={(e) => setProxyLocalIpValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                    )}
                    {/* Local IP Status Icon */}
                    {proxyLocalIpValue === connectionCtx.proxyLocalIP ? (
                      <i
                        className="ms-3 bi bi-check-circle text-success"
                        title="IP is saved in context"
                      ></i>
                    ) : (
                      <i
                        className="ms-3 bi bi-exclamation-triangle text-warning"
                        title="IP is not saved in context"
                      ></i>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          {savedProxyUrl && (
            <div>
              <button
                id="btnChangeProxy"
                className="btn btn-more02 me-3"
                onClick={(e) => {
                  ChangeProxy();
                  e.preventDefault(); // Prevents any unintended form submission
                }}
              >
                {t("pValidChangeProxy")}
              </button>
              <button
                id="btnResetProxy"
                className="btn btn-more02 me-6"
                onClick={(e) => {
                  ResetProxy();
                  e.preventDefault(); // Prevents any unintended form submission
                }}
              >
                {t("pValidResetProxy")}
              </button>
            </div>
          )}
          <hr />
        </details>
      )}
      <h2>{t("pEnableSTA", { DwarfType: connectionCtx.typeNameDwarf })}</h2>

      <p>
        {t("pEnableSTAContent", { DwarfType: connectionCtx.typeNameDwarf })}
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
            {t("pEnableSTAContent1", {
              DwarfType: connectionCtx.typeNameDwarf,
            })}
            <br />
          </li>
          <li>
            {t("pEnableSTAContent2", {
              DwarfType: connectionCtx.typeNameDwarf,
            })}
          </li>
          <li className="mb-2">
            {t("pEnableSTAContent3", {
              DwarfType: connectionCtx.typeNameDwarf,
            })}
          </li>
        </ol>
      )}
      <form onSubmit={checkConnection} className="mb-3 dw-sta-form">
        <div className="row mb-3">
          <div className="col-lg-2 col-md-4 col-12 text-lg-end">
            <label htmlFor="pwd" className="form-label">
              {t("pBluetoothPWD")}
            </label>
          </div>
          <div className="col-lg-2 col-md-10">
            <input
              className="form-control"
              id="pwd"
              name="pwd"
              placeholder="DWARF_12345678"
              required
              value={BluetoothPWD}
              onChange={handleInputPWDChange}
            />
          </div>
          <div className="col-lg-2 col-md-10 col-12 text-lg-end">
            <label htmlFor="ssid" className="form-label">
              {t("pSTA_SSID_Wifi")}
            </label>
          </div>
          <div className="col-lg-2 col-md-10">
            <input
              className="form-control"
              id="ssid"
              name="ssid"
              placeholder=""
              required
              value={Wifi_SSID}
              onChange={handleInputSSIDChange}
            />
          </div>
          <div className="col-lg-2 col-md-10 col-12 text-lg-end">
            <label htmlFor="wifipwd" className="form-label">
              {t("pSTA_PWD_Wifi")}
            </label>
          </div>
          <div className="col-lg-2 col-md-10">
            <input
              className="form-control"
              id="wifipwd"
              name="wifipwd"
              type="password"
              placeholder=""
              required
              value={Wifi_PWD}
              onChange={handleInputWifiPWDChange}
            />
          </div>
        </div>
        <WifiProfiles
          ssid={Wifi_SSID}
          password={Wifi_PWD}
          onUse={(ssid, password) => {
            setWifi_SSID(ssid);
            setWifi_PWD(password);
          }}
        />
        {useDirectBluetooth == true &&
          !isProxyOnServer &&
          stateBluetoothProxy &&
          stateBluetoothServer && (
            <div className="row mb-3">
              <div className="col-lg-6 col-md-10">
                <div>
                  <input
                    type="checkbox"
                    id="server"
                    name="server"
                    checked={connectionCtx.useDirectBluetoothServer}
                    onChange={(e) => handleCheckboxBleServerChange(e)}
                  />{" "}
                  {t("pDirecBluetoothOnServer")}
                </div>
              </div>
            </div>
          )}
        <div className="dw-connection-actions">
          <button id="btnWeb" type="submit" className="btn btn-more02">
            <i className="icon-bluetooth" /> {t("pConnectWeb")}
          </button>
          {useDirectBluetooth == true && (
            <button
              id="btnDirect"
              type="button"
              className="btn btn-more02"
              disabled={connecting}
              onClick={(e) => {
                e.preventDefault();
                void runExecutable();
              }}
            >
              <i className="icon-bluetooth" />
              {t("pDirectBluetooth")}
            </button>
          )}
          {renderConnectionStatus()}
        </div>
        {directBleBusy && (
          <div
            className="dw-ble-progress-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Connecting via Bluetooth"
          >
            <div
              className="dw-ble-progress-panel"
              role="status"
              aria-live="polite"
            >
              <span className="dw-ble-spinner" aria-hidden="true" />
              <h3>Connecting via Bluetooth</h3>
              <p>
                Scanning for your DWARF, reading its network settings, and
                resolving its current IP address. This can take up to two
                minutes.
              </p>
              <p className="dw-muted">
                Keep the telescope powered on and near this computer. The helper
                reports its result when it finishes.
              </p>
            </div>
          </div>
        )}
        {devices?.length > 0 && (
          <div className="row mb-3">
            <div className="col-lg-4 col-md-10 mt-3 d-flex align-items-center ">
              <select
                className="form-select me-3 w-auto" // Adjust width based on content
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
              >
                <option value="">Select a device</option>
                {devices.map((device, index) => (
                  <option key={index} value={device}>
                    {device}
                  </option>
                ))}
              </select>
              <button
                id="btnReconnect"
                className="btn btn-more02 me-6"
                onClick={(e) => handleSelect(e)}
                disabled={!selectedDevice}
              >
                <i className="icon-bluetooth" /> {t("pConnect")}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
