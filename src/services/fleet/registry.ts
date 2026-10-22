import type { DwarfModel } from "@/services/dwarf/deviceProfile";

export type FleetDeviceId = string;
export type FleetSessionId = string;

/** Persistable metadata only. Runtime connection/activity belongs to controllers. */
export type FleetRegistration = Readonly<{
  id: FleetDeviceId;
  alias: string;
  model?: DwarfModel;
  reportedName?: string;
  lastKnownHost?: string;
  sessionId?: FleetSessionId;
}>;

export type ObservingSession = Readonly<{
  id: FleetSessionId;
  name: string;
  createdAt: string;
}>;

export type FleetRegistrySnapshot = Readonly<{
  devices: Readonly<Record<FleetDeviceId, FleetRegistration>>;
  sessions: Readonly<Record<FleetSessionId, ObservingSession>>;
  selectedDeviceId?: FleetDeviceId;
}>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** getRandomValues also works on LAN HTTP origins where randomUUID is absent. */
function localUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function label(value: string): string {
  const result = value.trim();
  if (!result || result.length > 100)
    throw new Error("Use a name between 1 and 100 characters.");
  return result;
}

/**
 * A metadata registry, not a singleton connection with an array attached.
 * It deliberately has no transport access: selection and assignment cannot send
 * commands. FleetManager will coordinate this registry with owned controllers.
 */
export class FleetRegistry {
  private snapshot: FleetRegistrySnapshot = Object.freeze({
    devices: Object.freeze({}),
    sessions: Object.freeze({}),
  });
  private listeners = new Set<() => void>();

  constructor(
    private readonly createId: () => string = localUuid,
    private readonly now: () => Date = () => new Date(),
  ) {}

  getSnapshot = (): FleetRegistrySnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private publish(snapshot: FleetRegistrySnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener());
  }

  private nextId(): string {
    const id = this.createId().toLowerCase();
    if (!uuidPattern.test(id)) throw new Error("A local UUID v4 is required.");
    if (this.snapshot.devices[id] || this.snapshot.sessions[id])
      throw new Error("Duplicate local UUID; registration was not changed.");
    return id;
  }

  getDevice(id: FleetDeviceId): FleetRegistration {
    const device = Object.prototype.hasOwnProperty.call(
      this.snapshot.devices,
      id,
    )
      ? this.snapshot.devices[id]
      : undefined;
    if (!device)
      throw new Error("The requested fleet device is not registered.");
    return device;
  }

  register(input: {
    alias: string;
    model?: DwarfModel;
    reportedName?: string;
    lastKnownHost?: string;
  }): FleetRegistration {
    const alias = label(input.alias);
    if (
      input.model !== undefined &&
      !["dwarf2", "dwarf3", "dwarfmini"].includes(input.model)
    )
      throw new Error("Unsupported DWARF model.");
    const device = Object.freeze({
      id: this.nextId(),
      alias,
      model: input.model,
      reportedName: input.reportedName,
      lastKnownHost: input.lastKnownHost,
    });
    this.publish({
      ...this.snapshot,
      devices: Object.freeze({ ...this.snapshot.devices, [device.id]: device }),
    });
    return device;
  }

  rename(id: FleetDeviceId, alias: string): void {
    const device = this.getDevice(id);
    const normalized = label(alias);
    if (device.alias === normalized) return;
    this.updateDevice({ ...device, alias: normalized });
  }

  updateReportedName(id: FleetDeviceId, reportedName: string): void {
    const device = this.getDevice(id);
    const normalized = label(reportedName);
    if (!/^DWARF(?:3|_mini|II)?_[A-Za-z0-9]+$/i.test(normalized))
      throw new Error("Enter a valid DWARF Bluetooth identifier.");
    if (device.reportedName === normalized) return;
    this.updateDevice({ ...device, reportedName: normalized });
  }

  /** Endpoint is a hint, never a permanent identity or automatic merge key. */
  updateHost(id: FleetDeviceId, host: string): void {
    const device = this.getDevice(id);
    const normalized = host.trim();
    if (!normalized) throw new Error("A host is required.");
    if (device.lastKnownHost === normalized) return;
    this.updateDevice({ ...device, lastKnownHost: normalized });
  }

  private updateDevice(device: FleetRegistration): void {
    this.publish({
      ...this.snapshot,
      devices: Object.freeze({
        ...this.snapshot.devices,
        [device.id]: Object.freeze(device),
      }),
    });
  }

  select(id?: FleetDeviceId): void {
    if (id !== undefined) this.getDevice(id);
    if (this.snapshot.selectedDeviceId === id) return;
    this.publish({ ...this.snapshot, selectedDeviceId: id });
  }

  createSession(name: string): ObservingSession {
    const normalized = label(name);
    const session = Object.freeze({
      id: this.nextId(),
      name: normalized,
      createdAt: this.now().toISOString(),
    });
    this.publish({
      ...this.snapshot,
      sessions: Object.freeze({
        ...this.snapshot.sessions,
        [session.id]: session,
      }),
    });
    return session;
  }

  assignSession(deviceId: FleetDeviceId, sessionId?: FleetSessionId): void {
    const device = this.getDevice(deviceId);
    if (
      sessionId !== undefined &&
      !Object.prototype.hasOwnProperty.call(this.snapshot.sessions, sessionId)
    )
      throw new Error("The observing session does not exist.");
    if (device.sessionId === sessionId) return;
    this.updateDevice({ ...device, sessionId });
  }

  getSessionDevices(sessionId: FleetSessionId): readonly FleetRegistration[] {
    return Object.freeze(
      Object.values(this.snapshot.devices).filter(
        (device) => device.sessionId === sessionId,
      ),
    );
  }

  /** Caller must ensure the corresponding controller has been disconnected. */
  removeDisconnected(id: FleetDeviceId): void {
    this.getDevice(id);
    const devices = { ...this.snapshot.devices };
    delete devices[id];
    this.publish({
      ...this.snapshot,
      devices: Object.freeze(devices),
      selectedDeviceId:
        this.snapshot.selectedDeviceId === id
          ? undefined
          : this.snapshot.selectedDeviceId,
    });
  }

  serialize(): string {
    return JSON.stringify({
      version: 1,
      devices: Object.values(this.snapshot.devices),
      sessions: Object.values(this.snapshot.sessions),
    });
  }

  /** Validate completely before replacing metadata; ignore transient input fields. */
  restore(text: string): void {
    const input = JSON.parse(text);
    if (
      input?.version !== 1 ||
      !Array.isArray(input.devices) ||
      !Array.isArray(input.sessions)
    )
      throw new Error(
        "Unsupported or damaged Fleet data. Your saved data has not been overwritten.",
      );
    const devices: Record<string, FleetRegistration> = {};
    const sessions: Record<string, ObservingSession> = {};
    const ids = new Set<string>();
    const validateId = (id: unknown): string => {
      if (
        typeof id !== "string" ||
        !uuidPattern.test(id) ||
        ids.has(id.toLowerCase())
      )
        throw new Error("Invalid or duplicate Fleet identity.");
      ids.add(id.toLowerCase());
      return id.toLowerCase();
    };
    for (const value of input.sessions) {
      const id = validateId(value?.id);
      if (
        typeof value.name !== "string" ||
        typeof value.createdAt !== "string" ||
        !Number.isFinite(Date.parse(value.createdAt))
      )
        throw new Error("Invalid observing session.");
      sessions[id] = Object.freeze({
        id,
        name: label(value.name),
        createdAt: value.createdAt,
      });
    }
    for (const value of input.devices) {
      const id = validateId(value?.id);
      if (
        typeof value.alias !== "string" ||
        (value.model !== undefined &&
          !["dwarf2", "dwarf3", "dwarfmini"].includes(value.model))
      )
        throw new Error("Invalid Fleet device.");
      for (const field of ["lastKnownHost", "reportedName", "sessionId"])
        if (value[field] !== undefined && typeof value[field] !== "string")
          throw new Error("Invalid Fleet metadata.");
      if (
        value.sessionId !== undefined &&
        !Object.prototype.hasOwnProperty.call(sessions, value.sessionId)
      )
        throw new Error("Unknown saved observing session.");
      devices[id] = Object.freeze({
        id,
        alias: label(value.alias),
        model: value.model,
        lastKnownHost: value.lastKnownHost,
        reportedName: value.reportedName,
        sessionId: value.sessionId,
      });
    }
    this.publish({
      devices: Object.freeze(devices),
      sessions: Object.freeze(sessions),
    });
  }

  // Removal is intentionally deferred to FleetManager: it must first verify the
  // controller is disconnected. A registry-only remove would bypass that guard.
}
