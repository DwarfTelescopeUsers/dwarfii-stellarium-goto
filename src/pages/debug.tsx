import { useContext } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";

export default function DebugPage() {
  useLoadIntialValues();
  let connectionCtx = useContext(ConnectionContext);

  let messages = connectionCtx.logger;

  return (
    <div>
      <h1>Debugger</h1>
      <p>Debugger: {connectionCtx.debug ? "on" : "off"}</p>
      {messages &&
        messages.map((m, i) => (
          <div key={i}>
            <pre>{JSON.stringify(m, null, 2)}</pre>
          </div>
        ))}
    </div>
  );
}
