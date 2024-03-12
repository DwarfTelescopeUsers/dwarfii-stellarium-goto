/// <reference types="web-bluetooth" />
import { useContext, useState } from "react";
import type { FormEvent } from "react";

import {
  Dwarfii_Api,
  messageGetconfig,
  messageWifiSTA,
  analyzePacketBle,
} from "dwarfii_api";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { saveIPDwarfDB, saveBlePWDDwarfDB } from "@/db/db_utils";

export default function ConnectDwarfSTA() {
  let connectionCtx = useContext(ConnectionContext);

  const [connecting, setConnecting] = useState(false);
  const [findDwarfBluetooth, setFindDwarfBluetooth] = useState(false);
  const [etatBluetooth, setEtatBluetooth] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<boolean | undefined>(
    undefined
  );
  const [errorTxt, setErrorTxt] = useState("");

  let IsFirstStepOK = false;
  let configValue;
  let deviceDwarfII;
  let characteristicDwarfII;
  let BluetoothPWD;

  async function checkConnection(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const formBluetoothPWD = formData.get("pwd");
    BluetoothPWD = formBluetoothPWD?.toString();
    console.log("Get BluetoothPWD:", BluetoothPWD);

    try {
      // Connecting
      setConnecting(true);
      setFindDwarfBluetooth(false);
      setEtatBluetooth(false);

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: "DWARF" },
          { services: ["0000daf2-0000-1000-8000-00805f9b34fb"] },
        ],
        optionalServices: ["0000daf2-0000-1000-8000-00805f9b34fb"],
      });

      if (device) {
        deviceDwarfII = device;
        // Add the new class
        setFindDwarfBluetooth(true);
        setErrorTxt(deviceDwarfII.name);
        console.log("Got device:", deviceDwarfII.name);
        console.log("id:", deviceDwarfII.id);
        //console.log('uuids:', deviceDwarfII.uuids);
        deviceDwarfII.addEventListener(
          "gattserverdisconnected",
          onDisconnected
        );

        if (!deviceDwarfII.gatt) throw new Error("Can't get bluetooth gatt ");
        else console.log("gatt:", deviceDwarfII.gatt);

        const server = await deviceDwarfII.gatt.connect();
        if (!server) throw new Error("Can't get gatt bluetooth service");
        else console.log("Got bluetooth server");

        const service = await server.getPrimaryService(
          "0000daf2-0000-1000-8000-00805f9b34fb"
        );
        if (!server) throw new Error("Can't get bluetooth service");
        else console.log("Got bluetooth service");

        const characteristic = await service.getCharacteristic(
          "00009999-0000-1000-8000-00805f9b34fb"
        );
        if (!characteristic)
          throw new Error("Can't get bluetooth characteristic");

        characteristicDwarfII = characteristic;
        console.log("Got characteristic:", characteristicDwarfII.uuid);
        console.log("Got characteristic:", characteristicDwarfII.service);
        console.log(characteristicDwarfII);
        setEtatBluetooth(true);

        characteristicDwarfII.addEventListener(
          "characteristicvaluechanged",
          handleValueChanged
        );
        await characteristicDwarfII.startNotifications();

        const data_test = await characteristicDwarfII.readValue();
        console.log("Got detail characteristic:", data_test);
        console.log(data_test);

        // get Wifi
        let bufferGetConfig = messageGetconfig(BluetoothPWD);

        await characteristicDwarfII.writeValue(bufferGetConfig);
      }
    } catch (error) {
      // Add the new class
      setErrorTxt("Error, Retry...");
      console.error(error);
      setConnecting(false);
      setConnectionStatus(false);
    }
  }

  async function handleValueChanged(event) {
    try {
      let value = event.target.value;
      console.log("Value changed:", value);

      if (!IsFirstStepOK && value.byteLength) {
        let bufferReadConfig = new Uint8Array(value.buffer);
        console.log("Buffer:", bufferReadConfig);
        configValue = analyzePacketBle(bufferReadConfig, false);
        console.log("Read:", configValue);
        let result_data = JSON.parse(configValue);

        // check Error
        if (result_data.code && result_data.code != 0) {
          setErrorTxt(
            "Error get Config:" +
              result_data.code +
              " (" +
              Dwarfii_Api.DwarfBleErrorCode[result_data.code] +
              ")"
          );
          setConnecting(false);
          setConnectionStatus(false);
        }
        // check StaMod Configured
        else if (result_data.state != 2) {
          setErrorTxt(
            "Error WiFi configuration not Completed! Restart it and Use the mobile App."
          );
          setConnecting(false);
          setConnectionStatus(false);
        } else if (result_data.wifiMode != 2) {
          setErrorTxt(
            "Error STA MODE not Configured! Restart it and Use the mobile App."
          );
          setConnecting(false);
          setConnectionStatus(false);
        }
        // set WifiSTA
        else {
          IsFirstStepOK = true;
          let bufferSetWifiSta = messageWifiSTA(
            1,
            BluetoothPWD,
            result_data.ssid,
            result_data.psd
          );
          await characteristicDwarfII.writeValue(bufferSetWifiSta);
        }
      } else if (IsFirstStepOK && value.byteLength) {
        IsFirstStepOK = false;
        let bufferReadResult = new Uint8Array(value.buffer);
        console.log("Buffer:", bufferReadResult);
        configValue = analyzePacketBle(bufferReadResult, false);
        console.log("Read:", configValue);
        let result_data = JSON.parse(configValue);

        if (result_data.code && result_data.code != 0) {
          setErrorTxt(
            "Error set WifiSTA:" +
              result_data.code +
              " (" +
              Dwarfii_Api.DwarfBleErrorCode[result_data.code] +
              ")"
          );
          setConnecting(false);
          setConnectionStatus(false);
        } else {
          console.log("Connected with IP: ", result_data.ip);
          setErrorTxt(" IP: " + result_data.ip);

          connectionCtx.setIPDwarf(result_data.ip);
          saveIPDwarfDB(result_data.ip);
          connectionCtx.setBlePWDDwarf(BluetoothPWD);
          saveBlePWDDwarfDB(BluetoothPWD);
          setConnecting(false);
          setConnectionStatus(true);
        }
      }
    } catch (error) {
      // Add the new class
      setErrorTxt("Error, Retry...");
      console.error(error);
      setConnecting(false);
      setConnectionStatus(false);
    }
  }

  function onDisconnected() {
    console.log("> Bluetooth Device disconnected");
    setConnectionStatus(false);
  }

  function renderConnectionStatus() {
    if (connecting) {
      return <span>Connecting...</span>;
    }
    if (connectionStatus === undefined) {
      return <></>;
    }
    if (connectionStatus === false) {
      return <span className="text-danger">Connection failed {errorTxt}.</span>;
    }
    if (findDwarfBluetooth && !connectionStatus) {
      return (
        <span className="text-warning">
          Found Dwarf II
          {errorTxt}.
        </span>
      );
    }
    if (etatBluetooth && !connectionStatus) {
      return (
        <span className="text-warning">
          Connected to Dwarf II
          {errorTxt}.
        </span>
      );
    }

    return (
      <span className="text-success">
        Connection successful.
        {errorTxt}
      </span>
    );
  }

  return (
    <div>
      <h2>Enable STA Mode on Dwarf II</h2>

      <p>
        In order for this site to connect to the Dwarf II, the Dwarf II must
        have the STA mode configured and on, after startup a bluetoth connection
        must be made to to that.
      </p>

      <ol>
        <li className="mb-2">
          You can use the Dwarf II mobile app to connect first to the telescope
          to enable STA Mode. But due to the new host / node functionnality, the
          mobile app must be closed and killed from task manager
        </li>
        <li className="mb-2">
          You can also use this Button to enable it after startup without the
          mobile app.
        </li>
        <li className="mb-2">
          Click Connect. This site will try to connect with Bluetooth to Dwarf
          II.
        </li>
        <form onSubmit={checkConnection} className="mb-3">
          <div className="row mb-3">
            <div className="row mb-3">
              <div className="col-md-1">
                <label htmlFor="pwd" className="form-label">
                  Bluetooth PASSWORD
                </label>
              </div>
              <div className="col-md-11">
                <input
                  className="form-control"
                  id="pwd"
                  name="pwd"
                  placeholder="DWARF_12345678"
                  required
                  defaultValue={connectionCtx.BlePWDDwarf}
                />
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary me-3">
            Connect
          </button>{" "}
          {renderConnectionStatus()}
        </form>
      </ol>
    </div>
  );
}
