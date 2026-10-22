import { FleetRegistry } from "@/services/fleet/registry";
import {
  FleetManager,
  FLEET_ACTIVE_KEY,
  FLEET_STORAGE_KEY,
} from "@/services/fleet/manager";

describe("Fleet metadata persistence", () => {
  test("editable metadata cannot hide an active transport from duplicate-address checks", async () => {
    const factory = (id: string) => {
      let host: string | undefined;
      let connection = "disconnected";
      return {
        id,
        getConnectionHost: () => host,
        subscribePackets: () => () => {},
        getSnapshot: () => ({ connection }),
        connect: async (registration: { lastKnownHost: string }) => {
          host = registration.lastKnownHost;
          connection = "connected";
        },
        disconnect: () => {
          connection = "disconnected";
          host = undefined;
        },
      } as any;
    };
    const manager = new FleetManager(factory);
    try {
      const a = manager.registry.register({
        alias: "A",
        lastKnownHost: "192.0.2.1",
      });
      const b = manager.registry.register({
        alias: "B",
        lastKnownHost: "192.0.2.1",
      });
      await manager.connect(a.id);
      manager.registry.updateHost(a.id, "192.0.2.2");
      expect(manager.getActiveDeviceAtHost("192.0.2.1")?.id).toBe(a.id);
      expect(manager.getActiveDeviceAtHost("192.0.2.2")).toBeUndefined();
      await expect(manager.connect(b.id)).rejects.toThrow(
        "active Fleet connection",
      );
      await expect(manager.connect(a.id)).rejects.toThrow("Disconnect");
      manager.disconnect(a.id);
      await manager.connect(b.id);
      expect(manager.getDevice(b.id).getSnapshot().connection).toBe(
        "connected",
      );
    } finally {
      manager.dispose();
    }
  });

  test("disconnect cancels pending Connect ownership even if another session becomes ready", async () => {
    let ready!: () => void;
    const setControl = jest.fn();
    const manager = new FleetManager(
      (id: string) =>
        ({
          id,
          connect: async () => {},
          getSnapshot: () => ({ connection: "disconnected" }),
          waitUntilConnected: () =>
            new Promise<void>((resolve) => {
              ready = resolve;
            }),
          setControl,
          subscribePackets: () => () => {},
          disconnect: jest.fn(),
        }) as any,
    );
    try {
      const device = manager.registry.register({
        alias: "A",
        lastKnownHost: "192.0.2.1",
      });
      const pending = manager.connect(device.id, undefined, true);
      await Promise.resolve();
      manager.disconnect(device.id);
      await manager.connect(device.id);
      ready();
      await expect(pending).rejects.toThrow("cancelled");
      expect(setControl).not.toHaveBeenCalled();
    } finally {
      manager.dispose();
    }
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  test("legacy migration is idempotent and never restores connection authority", () => {
    localStorage.setItem("IPDwarf", "192.0.2.1");
    localStorage.setItem("connectionStatus", "true");
    const manager = new FleetManager();
    try {
      manager.initialize(localStorage, jest.fn());
      const first = manager.registry.serialize();
      manager.initialize(localStorage, jest.fn());
      expect(manager.registry.serialize()).toBe(first);
      const devices = Object.values(manager.registry.getSnapshot().devices);
      expect(devices).toHaveLength(1);
      expect(manager.getDevice(devices[0].id).getSnapshot().connection).toBe(
        "disconnected",
      );
      expect(localStorage.getItem("connectionStatus")).toBe("true");
      expect(localStorage.getItem("IPDwarf")).toBe("192.0.2.1");
    } finally {
      manager.dispose();
    }
  });
  test("round trips IDs, aliases and many-device session assignment", () => {
    let index = 0;
    const fleet = new FleetRegistry(
      () => `00000000-0000-4000-8000-${String(++index).padStart(12, "0")}`,
    );
    const a = fleet.register({ alias: "A", model: "dwarf2" });
    const b = fleet.register({ alias: "B", model: "dwarfmini" });
    const session = fleet.createSession("Orion");
    fleet.assignSession(a.id, session.id);
    fleet.assignSession(b.id, session.id);
    const restored = new FleetRegistry();
    restored.restore(fleet.serialize());
    expect(restored.getSnapshot()).toEqual(fleet.getSnapshot());
    expect(restored.getSessionDevices(session.id)).toHaveLength(2);
  });
  test("future version and corrupt data are preserved rather than overwritten", () => {
    const saved = JSON.stringify({ version: 42 });
    localStorage.setItem(FLEET_STORAGE_KEY, saved);
    const manager = new FleetManager();
    expect(() => manager.initialize(localStorage, jest.fn())).toThrow();
    expect(localStorage.getItem(FLEET_STORAGE_KEY)).toBe(saved);
  });
  test("restore strips forged connected/capturing fields", () => {
    const fleet = new FleetRegistry();
    fleet.restore(
      JSON.stringify({
        version: 1,
        sessions: [],
        devices: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            alias: "A",
            connected: true,
            activity: "capturing",
          },
        ],
      }),
    );
    expect(fleet.serialize()).not.toContain("capturing");
    expect(fleet.serialize()).not.toContain("connected");
  });

  test("refresh reopens only explicitly connected Fleet transports without claiming control", async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn();
    const factory = (id: string) =>
      ({
        id,
        subscribePackets: () => () => {},
        connect,
        disconnect,
        getSnapshot: () => ({ connection: "disconnected" }),
      }) as any;
    const first = new FleetManager(factory);
    first.initialize(localStorage, jest.fn(), sessionStorage);
    const device = first.registry.register({
      alias: "Mini",
      lastKnownHost: "192.0.2.1",
    });
    await first.connect(device.id, "/api/proxy");
    expect(JSON.parse(sessionStorage.getItem(FLEET_ACTIVE_KEY)!)).toEqual([
      device.id,
    ]);
    first.dispose();

    connect.mockClear();
    const restored = new FleetManager(factory);
    restored.initialize(localStorage, jest.fn(), sessionStorage);
    await restored.restoreConnections("/api/proxy");
    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({ id: device.id }),
      "/api/proxy",
    );
    restored.disconnect(device.id);
    expect(JSON.parse(sessionStorage.getItem(FLEET_ACTIVE_KEY)!)).toEqual([]);
    restored.dispose();
  });

  test("explicit Connect requests control after the handshake, but refresh does not", async () => {
    const calls: string[] = [];
    const factory = (id: string) =>
      ({
        id,
        subscribePackets: () => () => {},
        connect: async () => {
          calls.push("connect");
        },
        waitUntilConnected: async () => {
          calls.push("ready");
        },
        setControl: async (enabled: boolean) => {
          calls.push(`control:${enabled}`);
        },
        disconnect: jest.fn(),
        getSnapshot: () => ({ connection: "disconnected" }),
      }) as any;
    const first = new FleetManager(factory);
    first.initialize(localStorage, jest.fn(), sessionStorage);
    const device = first.registry.register({
      alias: "Mini",
      lastKnownHost: "192.0.2.1",
    });
    await first.connect(device.id, "/api/proxy", true);
    expect(calls).toEqual(["connect", "ready", "control:true"]);
    first.dispose();

    calls.length = 0;
    const restored = new FleetManager(factory);
    restored.initialize(localStorage, jest.fn(), sessionStorage);
    await restored.restoreConnections("/api/proxy");
    expect(calls).toEqual(["connect"]);
    restored.dispose();
  });
});
