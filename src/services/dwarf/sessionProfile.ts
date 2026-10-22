import type { CurrentProfile } from "dwarfii_api";

/** Preserve model routing, but never share a firmware client identity between
 * Setup, Fleet, or another browser tab. Keep it stable for this socket's life. */
export function createSessionProfile(profile: CurrentProfile): CurrentProfile {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return Object.freeze({
    ...profile,
    clientId: `${profile.clientId.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`,
  });
}

/** Keep Fleet's firmware identity stable across a refresh, but scoped to this tab. */
export function createFleetSessionProfile(
  profile: CurrentProfile,
  registrationId: string,
  storage?: Pick<Storage, "getItem" | "setItem">,
): CurrentProfile {
  const key = `dwarfium.fleet.client.${registrationId}`;
  try {
    const saved = storage?.getItem(key);
    if (
      saved &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        saved,
      )
    )
      return Object.freeze({ ...profile, clientId: saved });
    const generated = createSessionProfile(profile);
    storage?.setItem(key, generated.clientId);
    return generated;
  } catch {
    return createSessionProfile(profile);
  }
}
