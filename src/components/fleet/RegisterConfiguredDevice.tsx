import Link from "next/link";
import { useContext, useState } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { useFleet } from "@/stores/FleetContext";
import { validFleetHost } from "@/services/fleet/controller";
import { lastBleDevice } from "@/services/fleet/bleIdentity";

export default function RegisterConfiguredDevice() {
  const connection = useContext(ConnectionContext);
  const manager = useFleet();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <section
      className="dw-panel"
      aria-label="Add configured telescope to Fleet"
    >
      <h2>Add this telescope to Fleet</h2>
      <p>
        Use the location and Bluetooth/network setup below, then save the
        discovered address here. Registration does not connect or take control.
      </p>
      <p>
        Current address:{" "}
        <strong>{connection.IPDwarf || "Not discovered yet"}</strong>
      </p>
      <label className="form-label" htmlFor="fleet-device-name">
        Friendly name
      </label>
      <input
        className="form-control mb-2"
        id="fleet-device-name"
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Garden Mini"
      />
      <div className="d-flex flex-wrap gap-3 align-items-center">
        <button
          className="btn btn-more02"
          disabled={!name.trim() || !connection.IPDwarf}
          onClick={() => {
            setMessage("");
            setError("");
            try {
              const host = validFleetHost(connection.IPDwarf || "");
              const recentBle = lastBleDevice();
              if (
                Object.values(manager.registry.getSnapshot().devices).some(
                  (d) => d.lastKnownHost === host,
                )
              )
                throw new Error(
                  "This address is already registered in Fleet. Open its existing card.",
                );
              manager.registry.register({
                alias: name,
                lastKnownHost: host,
                reportedName:
                  recentBle?.host === host ? recentBle.name : undefined,
              });
              setMessage(
                "Telescope registered. If connected below, disconnect it there before connecting its Fleet card.",
              );
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : "Could not register this telescope.",
              );
            }
          }}
        >
          Save telescope to Fleet
        </button>
        <Link href="/fleet/">Return to Fleet →</Link>
      </div>
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <p className="small">
        Observing location is currently shared by this installation. Saved Wi-Fi
        profiles can be reused for each telescope.
      </p>
    </section>
  );
}
