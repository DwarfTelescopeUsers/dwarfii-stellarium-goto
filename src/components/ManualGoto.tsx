/* eslint react/no-unescaped-entities: 0 */

import { useContext, useState } from "react";
import Link from "next/link";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { wsURL, startGoto, startGotoCmd, socketSend } from "@/lib/dwarfii_api";
import { parseStellariumData } from "@/lib/stellarium_utils";
import {
  convertHMSToDecimalDegrees,
  convertDMSToDecimalDegrees,
} from "@/lib/math_utils";
import { ParsedStellariumData } from "@/types";

export default function ManualGoto() {
  let connectionCtx = useContext(ConnectionContext);
  const [errors, setErrors] = useState<string | undefined>();
  const [RA, setRA] = useState<number | undefined>();
  const [RARaw, setRARaw] = useState<string | undefined>();
  const [declination, setDeclination] = useState<number | undefined>();
  const [declinationRaw, setDeclinationRaw] = useState<string | undefined>();

  const [objectName, setObjectName] = useState<string | undefined>();

  function startGotoHandler() {
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
        console.log("startGoto:", message);
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
  }

  function validDataHandler(objectData: ParsedStellariumData) {
    setRARaw(objectData.RA);
    let parsedRA = convertHMSToDecimalDegrees(objectData.RA);
    if (parsedRA) {
      setRA(parsedRA);
    } else {
      setErrors("Invalid RA: " + objectData.RA);
    }

    setDeclinationRaw(objectData.declination);
    let parsedDeclination = convertDMSToDecimalDegrees(objectData.declination);
    if (parsedDeclination) {
      setDeclination(parsedDeclination);
    } else {
      setErrors("Invalid declination: " + objectData.declination);
    }

    setObjectName(objectData.objectName);
  }

  function invalidDataHandler(data: any) {
    setErrors("Could not parse data: " + data.selectioninfo);
  }

  function resetData() {
    setErrors(undefined);
    setDeclination(undefined);
    setRA(undefined);
  }

  function fetchStellariumData() {
    resetData();

    let url = connectionCtx.urlStellarium;
    if (url) {
      fetch(url, { signal: AbortSignal.timeout(2000) })
        .then((res) => res.json())
        .then((data) => {
          console.log("fetchStellariumData", data.selectioninfo);

          if (data.selectioninfo === "") {
            noObjectSelectedHandler();
          } else {
            const objectData = parseStellariumData(data.selectioninfo);
            if (objectData) {
              validDataHandler(objectData);
            } else {
              invalidDataHandler(data);
            }
          }
        })
        .catch((err) => {
          if (err.name === "AbortError" || err.message === "Failed to fetch") {
            setErrors("Can not connect to Stellarium");
          } else {
            setErrors("Error processing Stellarium data");
          }
          console.log("Fetch Stellarium data error:", err);
        });
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
          Select an object in Stellarium. Make sure "RA/Dec (on date)" is
          displayed.
        </li>
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
        <div className="col-sm-8">{RARaw}</div>
      </div>
      <div className="row mb-3">
        <div className="col-sm-4">Declination</div>
        <div className="col-sm-8">{declinationRaw}</div>
      </div>
      <button
        className="btn btn-primary"
        disabled={RARaw === undefined}
        onClick={startGotoHandler}
      >
        Goto
      </button>
    </div>
  );
}
