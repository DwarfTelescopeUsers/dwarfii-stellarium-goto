import Link from "next/link";
import { useSelectedFleetDevice } from "@/components/fleet/FleetWorkspace";
import ConnectDwarf from "./ConnectDwarf";

/** Setup must not label an existing Fleet-owned transport as disconnected. */
export default function FleetConnectionSetup() {
  const { device, controller, runtime } = useSelectedFleetDevice();
  if (
    !device ||
    !["connected", "connecting", "reconnecting"].includes(runtime.connection)
  )
    return <ConnectDwarf />;
  return (
    <>
      <p role="status">
        {device.alias} (
        {controller?.getConnectionHost() ?? device.lastKnownHost}) —{" "}
        {runtime.connection} through Fleet.
        {runtime.connection === "connected" &&
          (runtime.ownership === "control"
            ? " You have control."
            : " Monitoring only.")}
      </p>
      <Link href="/fleet">Manage this connection in Fleet</Link>
      <details>
        <summary>Set up a different telescope</summary>
        <ConnectDwarf />
      </details>
    </>
  );
}
