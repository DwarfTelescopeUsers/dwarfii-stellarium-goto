/* eslint react/no-unescaped-entities: 0 */

import { useContext, useState } from "react";
import Link from "next/link";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { wsURL, startGoto, startGotoCmd, socketSend } from "@/lib/dwarfii_api";
import { objectInfoPath, formatObjectName } from "@/lib/stellarium_utils";
import { StellariumObjectInfo } from "@/types";

export default function ManualGoto() {
  let connectionCtx = useContext(ConnectionContext);
  const [errors, setErrors] = useState<string | undefined>();
  const [gotoErrors, setGotoErrors] = useState<string | undefined>();
  const [RA, setRA] = useState<number | undefined>();
  const [declination, setDeclination] = useState<number | undefined>();

  const [objectName, setObjectName] = useState<string | undefined>();

  function startGotoHandler() {
    setGotoErrors(undefined);

    let lat = connectionCtx.latitude;
    let lon = connectionCtx.longitude;
    if (RA === undefined) return;
    if (declination === undefined) return;
    if (lat === undefined) return;
    if (lon === undefined) return;

    const socket = new WebSocket(wsURL);
    socket.addEventListener("open", () => {
      console.log("start startGoto...");
      let planet = null;
      let options = startGoto(
        planet,
        RA,
        declination,
        lat as number,
        lon as number
      );
      socketSend(socket, options);
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (message.interface === startGotoCmd) {
        if (message.code === -45) {
          setGotoErrors("GOTO target below the horizon");
        }
        if (message.code === -18) {
          setGotoErrors("Plate Solving failed");
        }
        console.log("startGoto:", message.code, message);
      } else {
        console.log(message);
      }
    });

    socket.addEventListener("error", (message) => {
      console.log("startGoto error:", message);
    });
  }

  function noObjectSelectedHandler() {
    setErrors("You must select an object in Stellarium.");
    setRA(undefined);
    setDeclination(undefined);
    setObjectName(undefined);
  }

  function validDataHandler(objectData: StellariumObjectInfo) {
    console.log("fetchStellariumData", objectData);
    setRA(objectData.ra);
    setDeclination(objectData.dec);
    setObjectName(formatObjectName(objectData));
  }

  function resetData() {
    setErrors(undefined);
    setDeclination(undefined);
    setRA(undefined);
  }

  function fetchStellariumData() {
    resetData();
    console.log("start fetchStellariumData...");

    let url = connectionCtx.urlStellarium;
    if (url) {
      fetch(`${url}${objectInfoPath}`, {
        signal: AbortSignal.timeout(2000),
      })
        .then((response) => {
          if (!response.ok) {
            if (response.status === 404) {
              noObjectSelectedHandler();
            } else {
              setErrors("Error when connecting to Stellarium");
            }
            return;
          }

          return response.json();
        })
        .then((data) => {
          validDataHandler(data);
        })
        .catch((err) => {
          if (err.name === "AbortError" || err.message === "Failed to fetch") {
            setErrors("Can not connect to Stellarium");
          } else {
            setErrors("Error processing Stellarium data");
          }
          console.log("Fetch Stellarium data error:", err);
        });
    } else {
      setErrors("App is not connect to Stellarium.");
    }
  }

  if (!connectionCtx.connectionStatus) {
    return (
      <div>
        <h2>Manual Goto</h2>{" "}
        <p>
          You must <Link href="setup-scope">connect</Link> to Dwarf II and
          Stellarium to use goto.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2>Manual Goto</h2>
      <ol>
        <li>
          Use the Dwarf II mobile app from Dwarf Labs to focus the scope,
          calibrate the goto, and set gain, exposure, and IR.
        </li>
        <li>Select an object in Stellarium.</li>
        <li>
          Import right acension and declination from Stellarium by clicking
          'Import Data'.
        </li>
        <li>Start goto by clicking 'Goto'</li>
      </ol>
      <button className="btn btn-primary  mb-3" onClick={fetchStellariumData}>
        Import Data
      </button>
      {errors && <p className="text-danger">{errors}</p>}
      <div className="row mb-3">
        <div className="col-sm-4">Latitude</div>
        <div className="col-sm-8">{connectionCtx.latitude}</div>
      </div>
      <div className="row mb-3">
        <div className="col-sm-4">Longitude</div>
        <div className="col-sm-8">{connectionCtx.longitude}</div>
      </div>
      <div className="row mb-3">
        <div className="col-sm-4">Object</div>
        <div className="col-sm-8">{objectName}</div>
      </div>
      <div className="row mb-3">
        <div className="col-sm-4">Right Acension</div>
        <div className="col-sm-8">{RA}</div>
      </div>
      <div className="row mb-3">
        <div className="col-sm-4">Declination</div>
        <div className="col-sm-8">{declination}</div>
      </div>
      <button
        className="btn btn-primary"
        disabled={RA === undefined}
        onClick={startGotoHandler}
      >
        Goto
      </button>
      {gotoErrors && <p className="text-danger">{gotoErrors}</p>}
    </div>
  );
}
