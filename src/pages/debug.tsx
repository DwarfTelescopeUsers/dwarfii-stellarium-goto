import { useContext } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";

import { deleteDebugMessagesDb } from "@/db/db_utils";

export default function DebugPage() {
  useLoadIntialValues();
  let connectionCtx = useContext(ConnectionContext);

  let messages = connectionCtx.logger;

  function deleteHandler() {
    connectionCtx.setLogger(undefined);
    deleteDebugMessagesDb();
  }

  return (
    <div>
      <h1>Debugger</h1>
      <div>
        Debugger status: {connectionCtx.debug ? "on" : "off"}{" "}
        <button className="btn btn-primary ms-5" onClick={deleteHandler}>
          Delete all messages
        </button>
      </div>
      {messages &&
        messages.map((m, i) => (
          <div key={i}>
            <pre>{JSON.stringify(m, null, 2)}</pre>
          </div>
        ))}
    </div>
  );
}
