import { useContext } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";

type PropType = {
  mode: string;
};
export default function StatusBar(props: PropType) {
  const { mode } = props;
  let connectionCtx = useContext(ConnectionContext);

  let connection = connectionCtx.connectionStatus
    ? "Connected"
    : "Not Connected";

  let coords =
    `Lat: ${connectionCtx.latitude?.toFixed(4) || "--"}, ` +
    `Lon: ${connectionCtx.longitude?.toFixed(4) || "--"}`;

  if (mode) {
    return (
      <div className="mb-2">
        {/* {JSON.stringify(connectionCtx, null, 2)}
        <br /> */}
        <span>{connection}</span>
        <span className="ms-4"> {coords}</span>
      </div>
    );
  } else {
    return <></>;
  }
}
