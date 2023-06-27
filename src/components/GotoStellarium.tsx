/* eslint react/no-unescaped-entities: 0 */

import { useContext, useState } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { statusPath, parseStellariumData } from "@/lib/stellarium_utils";
import { ParsedStellariumData } from "@/types";
import { startGotoHandler, stellariumErrorHandler } from "@/lib/goto_utils";
import {
  convertHMSToDecimalDegrees,
  convertDMSToDecimalDegrees,
} from "@/lib/math_utils";

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

  function validDataHandler(objectData: ParsedStellariumData) {
    let parsedRA = convertHMSToDecimalDegrees(objectData.RA);
    if (parsedRA) {
      setRA(parsedRA);
    } else {
      setErrors("Invalid RA: " + objectData.RA);
    }

    let parsedDeclination = convertDMSToDecimalDegrees(objectData.declination);
    if (parsedDeclination) {
      setDeclination(parsedDeclination);
    } else {
      setErrors("Invalid declination: " + objectData.declination);
    }

    setObjectName(objectData.objectName);
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
      fetch(`${url}${statusPath}`, {
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
          if (data.selectioninfo === "") {
            noObjectSelectedHandler();
          } else {
            const objectData = parseStellariumData(data.selectioninfo);
            console.log(objectData);
            if (objectData) {
              validDataHandler(objectData);
            }
          }
        })
        .catch((err) => stellariumErrorHandler(err, setErrors));
    } else {
      setErrors("App is not connect to Stellarium.");
    }
  }

  return (
    <div>
      {!connectionCtx.connectionStatusStellarium && (
        <p className="text-danger">
          You must connect to Stellarium for Import Data to work.
        </p>
      )}
      {!connectionCtx.connectionStatus && (
        <p className="text-danger">
          You must connect to Dwarf II for Goto to work.
        </p>
      )}

      <p>You can use Stellarium to help pick objects.</p>
      <ol>
        <li>Select an object in Stellarium.</li>
        <li>
          Import right acension and declination from Stellarium by clicking
          'Import Data'.
        </li>
        <li>Start goto by clicking 'Goto'</li>
      </ol>
      <button
        className={`btn ${
          connectionCtx.connectionStatusStellarium
            ? "btn-primary"
            : "btn-secondary"
        } mb-3`}
        onClick={fetchStellariumData}
        disabled={!connectionCtx.connectionStatusStellarium}
      >
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
        className={`btn ${RA !== undefined ? "btn-primary" : "btn-secondary"}`}
        onClick={() =>
          startGotoHandler(connectionCtx, setGotoErrors, RA, declination)
        }
        disabled={RA === undefined}
      >
        Goto
      </button>
      {gotoErrors && <p className="text-danger">{gotoErrors}</p>}
    </div>
  );
}
