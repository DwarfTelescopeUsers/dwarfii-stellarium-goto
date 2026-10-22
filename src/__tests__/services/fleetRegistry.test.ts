import { FleetRegistry } from "@/services/fleet/registry";

function registry() {
  let counter = 0;
  return new FleetRegistry(
    () => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`,
    () => new Date("2026-09-08T12:00:00Z"),
  );
}

describe("Fleet registry foundation", () => {
  test("same model, name and IP are not treated as permanent identity", () => {
    const fleet = registry();
    const input = { alias: "Garden", model: "dwarfmini" as const };
    const a = fleet.register({ ...input, lastKnownHost: "192.168.1.10" });
    const b = fleet.register({ ...input, lastKnownHost: "192.168.1.10" });
    expect(a.id).not.toBe(b.id);
    fleet.updateHost(a.id, "192.168.1.11");
    fleet.rename(a.id, "  Garden Mini  ");
    expect(fleet.getDevice(a.id)).toMatchObject({
      id: a.id,
      alias: "Garden Mini",
      lastKnownHost: "192.168.1.11",
    });
    expect(fleet.getDevice(b.id)).toBe(b);
  });

  test.each(["dwarf2", "dwarf3", "dwarfmini"] as const)(
    "registers %s without connecting or fabricating runtime status",
    (model) => {
      const device = registry().register({ alias: "Scope", model });
      expect(device.model).toBe(model);
      expect(device).not.toHaveProperty("connection");
      expect(device).not.toHaveProperty("activity");
    },
  );

  test("unknown model stays unknown", () => {
    expect(registry().register({ alias: "New scope" }).model).toBeUndefined();
  });

  test("selection changes neither device nor session metadata", () => {
    const fleet = registry();
    const a = fleet.register({ alias: "A" });
    const b = fleet.register({ alias: "B" });
    const devices = fleet.getSnapshot().devices;
    fleet.select(a.id);
    fleet.select(b.id);
    expect(fleet.getSnapshot().devices).toBe(devices);
    expect(fleet.getSnapshot().selectedDeviceId).toBe(b.id);
    expect(() => fleet.select("missing")).toThrow();
    expect(fleet.getSnapshot().selectedDeviceId).toBe(b.id);
  });

  test("one session can serve many devices; reassignment only changes A", () => {
    const fleet = registry();
    const a = fleet.register({ alias: "A" });
    const b = fleet.register({ alias: "B" });
    const first = fleet.createSession("Orion");
    const second = fleet.createSession("Andromeda");
    fleet.assignSession(a.id, first.id);
    fleet.assignSession(b.id, first.id);
    expect(fleet.getSessionDevices(first.id)).toHaveLength(2);
    const unchangedB = fleet.getDevice(b.id);
    fleet.assignSession(a.id, second.id);
    expect(fleet.getDevice(b.id)).toBe(unchangedB);
    expect(fleet.getSessionDevices(first.id).map((item) => item.id)).toEqual([
      b.id,
    ]);
    fleet.assignSession(a.id);
    expect(fleet.getDevice(a.id).sessionId).toBeUndefined();
    expect(fleet.getSessionDevices(second.id)).toHaveLength(0);
  });

  test("invalid assignment and prototype keys cannot change state", () => {
    const fleet = registry();
    const a = fleet.register({ alias: "A" });
    const before = fleet.getSnapshot();
    expect(() => fleet.assignSession(a.id, "toString")).toThrow();
    expect(() => fleet.getDevice("__proto__")).toThrow();
    expect(() => fleet.rename(a.id, " ")).toThrow();
    expect(fleet.getSnapshot()).toBe(before);
  });

  test("UUID collisions fail atomically instead of overwriting a device", () => {
    const fleet = new FleetRegistry(
      () => "00000000-0000-4000-8000-000000000001",
    );
    fleet.register({ alias: "A" });
    const before = fleet.getSnapshot();
    expect(() => fleet.register({ alias: "B" })).toThrow("Duplicate");
    expect(() => fleet.createSession("Session")).toThrow("Duplicate");
    expect(fleet.getSnapshot()).toBe(before);
  });

  test("rejects non-UUID identity factories", () => {
    const fleet = new FleetRegistry(() => "192.168.1.10");
    expect(() => fleet.register({ alias: "A" })).toThrow("UUID");
  });

  test("cached immutable snapshots, no-op updates and subscription cleanup", () => {
    const fleet = registry();
    const listener = jest.fn();
    const unsubscribe = fleet.subscribe(listener);
    const a = fleet.register({ alias: "A" });
    const before = fleet.getSnapshot();
    fleet.rename(a.id, "A");
    expect(fleet.getSnapshot()).toBe(before);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(before)).toBe(true);
    expect(Object.isFrozen(before.devices)).toBe(true);
    expect(Object.isFrozen(a)).toBe(true);
    unsubscribe();
    fleet.rename(a.id, "Updated");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(before.devices[a.id].alias).toBe("A");
  });
});
