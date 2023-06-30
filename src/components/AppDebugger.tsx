import Link from "next/link";
import { useContext } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { saveDebugDb } from "@/db/db_utils";

export default function AppDebugger() {
  let connectionCtx = useContext(ConnectionContext);

  function debugHandler() {
    let newValue = !connectionCtx.debug;
    connectionCtx.setDebug(newValue);
    saveDebugDb(newValue === true ? "true" : "false");
  }

  return (
    <div>
      <h2>Debugger</h2>
      <p>
        Turning on the dubugger lets you see all the messages sent between this
        app and Dwarf II on the <Link href="/debug">debug page</Link>.
      </p>

      <div className="row mb-3">
        <div className="col-md-1">
          <label className="form-check-label" htmlFor="debug">
            Debugger
          </label>
        </div>
        <div className="col-md-11">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="debug"
            defaultValue={connectionCtx.debug === true ? "true" : "false"}
            onChange={debugHandler}
          />
        </div>
      </div>
    </div>
  );
}
