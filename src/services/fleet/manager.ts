import { FleetRegistry } from "./registry";
import { FleetDeviceController, validFleetHost } from "./controller";
import type { CurrentPacket } from "dwarfii_api";

export const FLEET_STORAGE_KEY = "dwarfium.fleet.v1";
export const FLEET_ACTIVE_KEY = "dwarfium.fleet.active.v1";

export class FleetManager {
  readonly registry = new FleetRegistry();
  private controllers = new Map<string, FleetDeviceController>();
  private stopSaving?: () => void;
  private connectionStorage?: Pick<Storage, "getItem" | "setItem">;
  private desiredConnections = new Set<string>();
  private connectionRevisions = new Map<string, number>();
  private packetListener?: (id: string, packet: CurrentPacket) => void;
  setPacketListener(listener?: (id: string, packet: CurrentPacket) => void) {
    this.packetListener = listener;
  }

  constructor(
    private readonly factory = (id: string) => new FleetDeviceController(id),
  ) {}

  getDevice(id: string): FleetDeviceController {
    this.registry.getDevice(id);
    let controller = this.controllers.get(id);
    if (!controller) {
      controller = this.factory(id);
      controller.subscribePackets((packet) =>
        this.packetListener?.(id, packet),
      );
      this.controllers.set(id, controller);
    }
    return controller;
  }

  getActiveDeviceAtHost(host: string) {
    let normalized: string;
    try {
      normalized = validFleetHost(host);
    } catch {
      return undefined;
    }
    for (const [id, controller] of Array.from(this.controllers)) {
      if (
        ["connected", "connecting", "reconnecting"].includes(
          controller.getSnapshot().connection,
        ) &&
        controller.getConnectionHost() === normalized
      )
        return this.registry.getDevice(id);
    }
    return undefined;
  }

  async connect(id: string, proxy?: string, requestControl = false) {
    const registration = this.registry.getDevice(id);
    const host = validFleetHost(registration.lastKnownHost ?? "");
    const existing = this.getActiveDeviceAtHost(host);
    if (existing && existing.id !== id)
      throw new Error("This address already has an active Fleet connection.");
    const controller = this.getDevice(id);
    if (
      ["connected", "connecting", "reconnecting"].includes(
        controller.getSnapshot().connection,
      ) &&
      controller.getConnectionHost() !== host
    )
      throw new Error("Disconnect this telescope before changing its address.");
    const revision = (this.connectionRevisions.get(id) ?? 0) + 1;
    this.connectionRevisions.set(id, revision);
    this.desiredConnections.add(id);
    this.saveDesiredConnections();
    await controller.connect(registration, proxy);
    if (requestControl) {
      const checkIntent = () => {
        if (this.connectionRevisions.get(id) !== revision)
          throw new Error("Telescope connection was cancelled.");
      };
      checkIntent();
      await controller.waitUntilConnected();
      checkIntent();
      await controller.setControl(true);
    }
  }

  disconnect(id: string) {
    this.connectionRevisions.set(
      id,
      (this.connectionRevisions.get(id) ?? 0) + 1,
    );
    this.desiredConnections.delete(id);
    this.saveDesiredConnections();
    this.getDevice(id).disconnect();
  }

  /** Reopen monitoring transports after a document reload; never claim control. */
  async restoreConnections(proxy?: string) {
    await Promise.all(
      Array.from(this.desiredConnections).map(async (id) => {
        try {
          await this.connect(id, proxy);
        } catch {
          // A stale address or unavailable telescope remains visible in Fleet.
        }
      }),
    );
  }

  private saveDesiredConnections() {
    try {
      this.connectionStorage?.setItem(
        FLEET_ACTIVE_KEY,
        JSON.stringify(Array.from(this.desiredConnections)),
      );
    } catch {
      // Browser storage may be disabled; manual connections still work.
    }
  }

  remove(id: string) {
    const controller = this.controllers.get(id);
    if (
      controller &&
      !["disconnected", "error"].includes(controller.getSnapshot().connection)
    )
      throw new Error("Disconnect this telescope before removing it.");
    controller?.disconnect();
    this.controllers.delete(id);
    this.connectionRevisions.set(
      id,
      (this.connectionRevisions.get(id) ?? 0) + 1,
    );
    this.desiredConnections.delete(id);
    this.saveDesiredConnections();
    this.registry.removeDisconnected(id);
  }

  initialize(
    storage: Pick<Storage, "getItem" | "setItem">,
    onError: (message: string) => void,
    connectionStorage?: Pick<Storage, "getItem" | "setItem">,
  ) {
    this.stopSaving?.();
    const saved = storage.getItem(FLEET_STORAGE_KEY);
    if (saved !== null) this.registry.restore(saved);
    else {
      const legacyHost = storage.getItem("IPDwarf");
      if (
        legacyHost &&
        !Object.keys(this.registry.getSnapshot().devices).length
      ) {
        try {
          validFleetHost(legacyHost);
          this.registry.register({
            alias: "My DWARF",
            lastKnownHost: legacyHost,
          });
        } catch {
          onError(
            "Your previous device address needs review. Existing settings have been preserved.",
          );
        }
      }
      storage.setItem(FLEET_STORAGE_KEY, this.registry.serialize());
    }
    this.stopSaving = this.registry.subscribe(() => {
      try {
        storage.setItem(FLEET_STORAGE_KEY, this.registry.serialize());
      } catch {
        onError(
          "Fleet changes could not be saved. Keep this window open and check available browser storage.",
        );
      }
    });
    this.connectionStorage = connectionStorage;
    this.desiredConnections.clear();
    try {
      const savedConnections = JSON.parse(
        connectionStorage?.getItem(FLEET_ACTIVE_KEY) ?? "[]",
      );
      if (Array.isArray(savedConnections))
        for (const id of savedConnections)
          if (
            typeof id === "string" &&
            this.registry.getSnapshot().devices[id]?.lastKnownHost
          )
            this.desiredConnections.add(id);
    } catch {
      // Invalid session state cannot grant ownership or block Fleet setup.
    }
  }

  dispose() {
    this.stopSaving?.();
    this.stopSaving = undefined;
    this.controllers.forEach((controller, id) => {
      this.connectionRevisions.set(
        id,
        (this.connectionRevisions.get(id) ?? 0) + 1,
      );
      controller.disconnect();
    });
  }
}
