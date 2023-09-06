import { useState, useContext, useEffect } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";

import { calibrationHandler, stopGotoHandler } from "@/lib/goto_utils";
import eventBus from "@/lib/event_bus";
import { AstroObject } from "@/types";
import GotoModal from "../astroObjects/GotoModal";

type Message = {
  [k: string]: string;
};

export default function CalibrationDwarf() {
  let connectionCtx = useContext(ConnectionContext);
  const [errors, setErrors] = useState<string | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [gotoMessages, setGotoMessages] = useState<Message[]>([] as Message[]);

  useEffect(() => {
    eventBus.on("clearErrors", () => {
      setErrors(undefined);
    });
  }, []);

  function calibrateFn() {
    setShowModal(true);
    calibrationHandler(connectionCtx, setErrors, (options) => {
      setGotoMessages((prev) => prev.concat(options));
    });
  }

  function stopGotoFn() {
    setShowModal(true);
    stopGotoHandler(connectionCtx, setErrors, (options) => {
      setGotoMessages((prev) => prev.concat(options));
    });
  }

  return (
    <>
      <h2>Calibrate the Dwarf II</h2>

      <p>
        In order to use Astro function, you must calibrate the dwarf II first.
      </p>

      <div className="col-md-3">
        <button
          className={`btn ${
            connectionCtx.connectionStatus ? "btn-primary" : "btn-secondary"
          } me-2 mb-2`}
          onClick={calibrateFn}
          disabled={!connectionCtx.connectionStatus}
        >
          Calibrate
        </button>
        <button
          className={`btn ${
            connectionCtx.connectionStatus ? "btn-primary" : "btn-secondary"
          } mb-2`}
          onClick={stopGotoFn}
          disabled={!connectionCtx.connectionStatus}
        >
          Stop Goto
        </button>
        <br />
        <GotoModal
          object={
            {
              displayName: "Calibration",
              ra: "",
              dec: "",
            } as AstroObject
          }
          showModal={showModal}
          setShowModal={setShowModal}
          messages={gotoMessages}
          setMessages={setGotoMessages}
        />
        {errors && <span className="text-danger">{errors}</span>}
      </div>
    </>
  );
}
