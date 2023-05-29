/* eslint react/no-unescaped-entities: 0 */

import { useContext, useState } from "react";
import Link from "next/link";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { objectInfoPath, formatObjectName } from "@/lib/stellarium_utils";
import { StellariumObjectInfo } from "@/types";
import { startGotoHandler, errorHandler } from "@/lib/goto_utils";

export default function ManualGoto() {
  let connectionCtx = useContext(ConnectionContext);
  const [errors, setErrors] = useState<string | undefined>();
  const [gotoErrors, setGotoErrors] = useState<string | undefined>();
  const [RA, setRA] = useState<number | undefined>();
  const [declination, setDeclination] = useState<number | undefined>();
  const [objectName, setObjectName] = useState<string | undefined>();

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
        .catch((err) => errorHandler(err, setErrors));
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
        onClick={() =>
          startGotoHandler(connectionCtx, setGotoErrors, RA, declination)
        }
      >
        Goto
      </button>
      {gotoErrors && <p className="text-danger">{gotoErrors}</p>}
    </div>
  );
}
