import { useEffect, useState } from "react";

export const WIFI_PROFILES_KEY = "dwarfium.wifi-profiles.v1";
type Profile = { ssid: string; password: string };
function readProfiles(): Profile[] {
  const raw = localStorage.getItem(WIFI_PROFILES_KEY);
  if (!raw) return [];
  const value = JSON.parse(raw);
  if (
    value.version !== 1 ||
    !Array.isArray(value.profiles) ||
    value.profiles.length > 100 ||
    value.profiles.some(
      (p) =>
        !p ||
        typeof p.ssid !== "string" ||
        !p.ssid ||
        p.ssid.length > 32 ||
        typeof p.password !== "string" ||
        p.password.length > 128,
    )
  )
    throw new Error(
      "Saved Wi-Fi profiles could not be read. Existing data was not changed.",
    );
  return value.profiles.map((p) => ({ ssid: p.ssid, password: p.password }));
}

export default function WifiProfiles({
  ssid,
  password,
  onUse,
}: {
  ssid: string;
  password: string;
  onUse: (ssid: string, password: string) => void;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      setProfiles(readProfiles());
    } catch {
      setError(
        "Local Wi-Fi profiles are unavailable. You can still enter credentials manually.",
      );
    }
  }, []);
  const change = (
    update: (current: Profile[]) => Profile[],
    message: string,
  ) => {
    setError("");
    setNotice("");
    try {
      const next = update(readProfiles());
      localStorage.setItem(
        WIFI_PROFILES_KEY,
        JSON.stringify({ version: 1, profiles: next }),
      );
      setProfiles(next);
      setNotice(message);
    } catch {
      setError(
        "Could not save the profile change. Check local browser storage; no credentials were sent.",
      );
    }
  };
  return (
    <section className="dw-panel my-3" aria-label="Saved Wi-Fi profiles">
      <h3 style={{ fontSize: "1rem" }}>Saved Wi-Fi profiles</h3>
      <p className="small">
        Optional: save the Wi-Fi name and password on this browser/app only.
        Passwords are not encrypted; save only on a trusted computer. Profiles
        are not synced or included in Fleet metadata.
      </p>
      <label className="form-label" htmlFor="saved-wifi-profile">
        Local profile
      </label>
      <select
        id="saved-wifi-profile"
        className="form-select mb-2"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Select a saved network</option>
        {profiles.map((p) => (
          <option key={p.ssid} value={p.ssid}>
            {p.ssid}
          </option>
        ))}
      </select>
      <div className="d-flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-more02"
          disabled={!ssid || ssid.length > 32 || password.length > 128}
          onClick={() => {
            change(
              (current) => [
                ...current.filter((p) => p.ssid !== ssid),
                { ssid, password },
              ],
              "Wi-Fi profile saved locally.",
            );
          }}
        >
          Save current Wi-Fi profile
        </button>
        <button
          type="button"
          className="btn btn-more02"
          disabled={!selected}
          onClick={() => {
            const profile = profiles.find((p) => p.ssid === selected);
            if (profile) {
              onUse(profile.ssid, profile.password);
              setNotice("Profile loaded. Connect with Bluetooth when ready.");
            }
          }}
        >
          Use profile
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={!selected}
          onClick={() => {
            change(
              (current) => current.filter((p) => p.ssid !== selected),
              "Saved profile deleted. Credentials already entered in the form are unchanged.",
            );
            setSelected("");
          }}
        >
          Delete saved profile
        </button>
      </div>
      {notice && (
        <p role="status" className="small mt-2">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="small text-danger mt-2">
          {error}
        </p>
      )}
    </section>
  );
}
