import {
  CurrentWebSocketHandler,
  getCurrentProfile,
  normalizeCurrentDeviceInfo,
  parseCurrentJsonLossless,
  wsURL,
  deviceInfo,
  type CurrentCaptureSettings,
  type CurrentProfile,
  type CurrentCommand,
  type CurrentPacket,
  type CurrentWebSocketOptions,
  type CurrentWebSocketState,
  type CurrentCameraCatalog,
} from "dwarfii_api";
import { normalizeDeviceCameraCatalog as normalizeCurrentCameraCatalog } from "@/services/dwarf/catalog";
import { executeCurrentCaptureWithRuntime } from "@/services/dwarf/captureRuntime";
import {
  requestCaptureCommand,
  captureWarning,
} from "@/services/dwarf/captureCommands";
import type { V3DeviceTelemetry } from "@/services/dwarf/telemetry";
import type { FleetRegistration } from "./registry";
import { createFleetSessionProfile } from "@/services/dwarf/sessionProfile";
import { WebSocketHandler } from "@/services/dwarf/connection";
import { reducePreviewTypes } from "@/services/dwarf/previewState";
import {
  reduceSessionPreview,
  type SessionPreviewProgress,
} from "@/services/dwarf/sessionPreview";
import { decodeV3TelemetryPacket } from "@/services/dwarf/telemetry";
import type { DwarfModel } from "@/services/dwarf/deviceProfile";
import {
  reduceActivity,
  summarizeActivity,
  type ActivityEvidence,
} from "./activity";

export type FleetRuntime = Readonly<{
  captureWarning?: string;
  generation?: number;
  model?: DwarfModel;
  connection:
    "disconnected" | "connecting" | "connected" | "reconnecting" | "error";
  activity:
    "unknown" | "idle" | "capturing" | "focusing" | "slewing" | "tracking";
  ownership: "unknown" | "control" | "slave";
  telemetry: Readonly<V3DeviceTelemetry>;
  frames?: number;
  stackedFrames?: number;
  capturePreviews?: readonly { cameraId: 0 | 1; revision: number }[];
  streamTypeTele?: number;
  streamTypeWide?: number;
  lastSeen?: number;
  error?: string;
}>;

export const offlineRuntime: FleetRuntime = Object.freeze({
  connection: "disconnected",
  activity: "unknown",
  ownership: "unknown",
  telemetry: Object.freeze({}),
});

export function validFleetHost(value: string): string {
  const host = value.trim();
  if (
    !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) ||
    host
      .split(".")
      .some((part) => Number(part) > 255 || part !== String(Number(part)))
  )
    throw new Error(
      "Enter the telescope's IPv4 address, without a port or URL.",
    );
  return host;
}

/** One controller owns one SDK transport and all of its asynchronous work. */
export class FleetDeviceController {
  private client?: CurrentWebSocketHandler;
  private detach?: () => void;
  private discovery?: AbortController;
  private requests = new Set<AbortController>();
  private catalogs = new Map<number, CurrentCameraCatalog>();
  private epoch = 0;
  private poll?: ReturnType<typeof setInterval>;
  private snapshot = offlineRuntime;
  private listeners = new Set<() => void>();
  private packetListeners = new Set<(packet: CurrentPacket) => void>();
  private proxy?: string;
  private host?: string;
  private activity: ActivityEvidence = {};
  private previewRevision = 0;
  private previewProgress: [SessionPreviewProgress, SessionPreviewProgress] = [
    {},
    {},
  ];
  private profile?: CurrentProfile;
  private capturePending = false;
  private captureRevision = 0;
  private workspaceSocket?: WebSocketHandler;
  private polling = false;

  getWorkspaceSocket() {
    if (!this.client || !this.host) return undefined;
    return (this.workspaceSocket ??= WebSocketHandler.fromFleet(
      this.client,
      this.host,
    ));
  }
  releaseWorkspaceSocket() {
    this.workspaceSocket?.disposeBorrowed();
    this.workspaceSocket = undefined;
  }

  constructor(
    readonly id: string,
    private readonly options: CurrentWebSocketOptions = {},
    private readonly fetcher: typeof fetch = (...args) => fetch(...args),
  ) {}

  getSnapshot = () => this.snapshot;
  subscribePackets(listener: (packet: CurrentPacket) => void) {
    this.packetListeners.add(listener);
    return () => {
      this.packetListeners.delete(listener);
    };
  }
  /** Actual transport destination, independent of editable registry metadata. */
  getConnectionHost = () => this.host;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  /** Wait for the SDK handshake before issuing commands after an explicit Connect. */
  waitUntilConnected(timeoutMs = 20_000): Promise<void> {
    if (this.snapshot.connection === "connected") return Promise.resolve();
    const epoch = this.epoch;
    return new Promise((resolve, reject) => {
      let finished = false;
      let unsubscribe = () => {};
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        unsubscribe();
        if (error) reject(error);
        else resolve();
      };
      const check = () => {
        if (epoch !== this.epoch || this.snapshot.connection === "disconnected")
          finish(new Error("Telescope connection was cancelled."));
        else if (this.snapshot.connection === "connected") finish();
        else if (this.snapshot.connection === "error")
          finish(
            new Error(this.snapshot.error || "Telescope connection failed."),
          );
      };
      const timeout = setTimeout(
        () => finish(new Error("Telescope connection timed out.")),
        timeoutMs,
      );
      unsubscribe = this.subscribe(check);
      check();
    });
  }
  private publish(update: Partial<FleetRuntime>) {
    this.snapshot = Object.freeze({ ...this.snapshot, ...update });
    this.listeners.forEach((listener) => listener());
  }
  private url(target: string) {
    return this.proxy
      ? `${this.proxy}?target=${encodeURIComponent(target)}`
      : target;
  }

  async connect(device: FleetRegistration, proxy?: string): Promise<void> {
    if (device.id !== this.id) throw new Error("Device identity mismatch.");
    if (
      ["connecting", "connected", "reconnecting"].includes(
        this.snapshot.connection,
      )
    )
      return;
    const host = validFleetHost(device.lastKnownHost ?? "");
    this.disconnect();
    const epoch = this.epoch;
    this.proxy = proxy;
    this.host = host;
    const abort = new AbortController();
    this.discovery = abort;
    const timeout = setTimeout(() => abort.abort(), 10_000);
    this.publish({ connection: "connecting", error: undefined });
    try {
      const response = await this.fetcher(this.url(deviceInfo(host)), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: abort.signal,
      });
      if (!response.ok)
        throw new Error(`Device discovery failed (${response.status}).`);
      const info = normalizeCurrentDeviceInfo(await response.text());
      if (epoch !== this.epoch) return;
      if (device.model && device.model !== info.profile.model)
        throw new Error(
          "This address reports a different DWARF model. Review its registration before connecting.",
        );
      this.publish({ model: info.profile.model });
      this.profile = getCurrentProfile(info.hardwareId);
      const client = new CurrentWebSocketHandler(
        createFleetSessionProfile(
          getCurrentProfile(info.hardwareId),
          device.id,
          typeof sessionStorage === "undefined" ? undefined : sessionStorage,
        ),
        this.options,
      );
      this.client = client;
      this.detach = client.subscribe((state, packet) => {
        if (epoch === this.epoch) this.receive(state, packet);
      });
      // The Next HTTP API route does not upgrade WebSockets. In local API mode
      // use the SDK's direct telescope transport, like the legacy workspace.
      const proxyAddress =
        proxy && !proxy.startsWith("/") ? new URL(proxy).host : undefined;
      client.connect(
        wsURL(host, proxyAddress, proxy?.startsWith("https:") ?? false),
      );
      this.poll = setInterval(() => {
        if (client.ready && !this.polling) {
          this.polling = true;
          void client
            .request("getDeviceState")
            .catch((error) => {
              if (epoch === this.epoch) this.publish({ error: String(error) });
            })
            .finally(() => {
              if (epoch === this.epoch) this.polling = false;
            });
        }
      }, 10_000);
    } catch (error) {
      if (epoch === this.epoch)
        this.publish({
          connection: "error",
          error: error instanceof Error ? error.message : String(error),
        });
    } finally {
      clearTimeout(timeout);
      if (this.discovery === abort) this.discovery = undefined;
    }
  }

  private receive(state: CurrentWebSocketState, packet?: CurrentPacket) {
    const ready = state.session.phase === "ready";
    const connection = ready
      ? "connected"
      : state.transport === "open"
        ? "connecting"
        : state.transport === "disconnected" && state.error
          ? "error"
          : state.transport;
    const update: { -readonly [K in keyof FleetRuntime]?: FleetRuntime[K] } = {
      generation: state.session.generation,
      connection,
      ownership: state.session.ownership,
      error: state.error?.message,
    };
    if (!ready) {
      update.captureWarning = undefined;
      this.activity = {};
      this.catalogs.clear();
      this.requests.forEach((request) => request.abort());
      update.activity = "unknown";
      update.telemetry = Object.freeze({});
      update.frames = undefined;
      update.stackedFrames = undefined;
      update.capturePreviews = undefined;
      this.previewProgress = [{}, {}];
      update.streamTypeTele = undefined;
      update.streamTypeWide = undefined;
    }
    if (ready && packet?.known && packet.type !== 0) {
      const preview = reducePreviewTypes(
        {
          tele: this.snapshot.streamTypeTele,
          wide: this.snapshot.streamTypeWide,
        },
        packet,
      );
      update.streamTypeTele = preview.tele;
      update.streamTypeWide = preview.wide;
      if (
        [11005, 11016, 11050].includes(packet.cmd) &&
        captureWarning(packet.data.code)
      )
        update.captureWarning = captureWarning(packet.data.code);
      if (
        packet.type === 2 &&
        [15208, 15236].includes(packet.cmd) &&
        [0, 3].includes(packet.data.state ?? 0)
      )
        update.captureWarning = undefined;
      update.lastSeen = Date.now();
      const telemetry = decodeV3TelemetryPacket(packet);
      if (telemetry)
        update.telemetry = Object.freeze({
          ...this.snapshot.telemetry,
          ...telemetry,
        });
      const previousActivity = this.activity;
      this.activity = reduceActivity(this.activity, packet);
      const activeCapture = (value?: number) => value === 1 || value === 2;
      update.capturePreviews = ([0, 1] as const)
        .filter((cameraId) =>
          activeCapture(this.activity[cameraId === 0 ? "tele" : "wide"]),
        )
        .map((cameraId) => {
          const field = cameraId === 0 ? "tele" : "wide";
          const previous = this.snapshot.capturePreviews?.find(
            (item) => item.cameraId === cameraId,
          );
          return {
            cameraId,
            revision:
              activeCapture(previousActivity[field]) && previous
                ? previous.revision
                : ++this.previewRevision,
          };
        });
      update.activity = summarizeActivity(this.activity);
      if (
        [2, 3].includes(packet.type) &&
        [15209, 15237, 15263].includes(packet.cmd)
      ) {
        const cameraId = packet.cmd === 15237 ? 1 : 0;
        const progress = reduceSessionPreview(
          this.previewProgress[cameraId],
          packet,
          cameraId,
        );
        this.previewProgress[cameraId] = progress;
        update.frames = progress.frames;
        update.stackedFrames = progress.stackedFrames;
      }
    }
    this.publish(update);
    if (packet?.known)
      this.packetListeners.forEach((listener) => {
        try {
          listener(packet);
        } catch (error) {
          console.warn("Device log listener failed", error);
        }
      });
  }

  /** Commands are bound to this controller, never resolved through UI selection. */
  async request(
    operation: CurrentCommand,
    values: Record<string, unknown> = {},
  ) {
    const client = this.client;
    if (!client?.ready) throw new Error("This telescope is not connected.");
    if (
      ![
        "getDeviceState",
        "getQuickSets",
        "getSavedInfinityPosition",
        "getAllShootingSchedule",
        "getShootingScheduleById",
        "setMasterLock",
      ].includes(operation) &&
      client.session.state.ownership !== "control"
    )
      throw new Error(
        "Request control of this telescope before sending commands.",
      );
    const epoch = this.epoch;
    const generation = client.session.state.generation;
    // Stop cancels unsent capture configuration steps as well as the device job.
    if (operation === "stopTeleCapture" || operation === "stopWideCapture")
      this.captureRevision++;
    try {
      const result = await requestCaptureCommand(client, operation, values);
      if (
        epoch !== this.epoch ||
        client !== this.client ||
        generation !== client.session.state.generation ||
        !client.ready
      )
        throw new Error("Command result belongs to a previous connection.");
      if (
        operation === "continueCapture" ||
        operation === "stopTeleCapture" ||
        operation === "stopWideCapture"
      )
        this.publish({ captureWarning: undefined });
      return result;
    } catch (error) {
      if (
        epoch === this.epoch &&
        generation === client.session.state.generation
      )
        this.publish({
          error: error instanceof Error ? error.message : String(error),
        });
      throw error;
    }
  }

  /** Ownership is confirmed by SDK session evidence, never optimistically set. */
  async setControl(enabled: boolean): Promise<void> {
    await this.request("setMasterLock", { lock: enabled });
  }

  getProfile() {
    return this.profile;
  }

  async capture(settings: CurrentCaptureSettings) {
    if (this.capturePending)
      throw new Error("A capture submission is already in progress.");
    const client = this.client;
    const profile = this.profile;
    if (
      !client?.ready ||
      !profile ||
      client.session.state.ownership !== "control"
    )
      throw new Error("Connect and request control before starting capture.");
    const epoch = this.epoch;
    const generation = client.session.state.generation;
    this.capturePending = true;
    const revision = this.captureRevision;
    try {
      const catalog = await this.loadCatalog(2);
      const transport = {
        get state() {
          return client.state;
        },
        request: (
          operation: CurrentCommand,
          values?: Record<string, unknown>,
        ) => {
          if (
            revision !== this.captureRevision ||
            epoch !== this.epoch ||
            client !== this.client ||
            generation !== client.session.state.generation
          )
            throw new Error(
              "Capture belongs to a previous connection. Review settings and retry.",
            );
          return this.request(operation, values);
        },
      };
      const result = await executeCurrentCaptureWithRuntime(
        client,
        transport,
        profile,
        catalog,
        settings,
        () => this.loadCatalog(2),
      );
      if (
        epoch !== this.epoch ||
        client !== this.client ||
        generation !== client.session.state.generation ||
        !client.ready
      )
        throw new Error("Capture result belongs to a previous connection.");
      return result;
    } finally {
      if (epoch === this.epoch) this.capturePending = false;
    }
  }

  async gotoCoordinates(ra: number, dec: number) {
    if (
      !Number.isFinite(ra) ||
      ra < 0 ||
      ra >= 24 ||
      !Number.isFinite(dec) ||
      dec < -90 ||
      dec > 90
    )
      throw new Error(
        "Enter RA in hours [0, 24) and declination in degrees [-90, 90].",
      );
    return this.request("gotoEquatorial", {
      ra,
      dec,
      gotoOnly: true,
      targetName: "Fleet coordinates",
    });
  }

  async loadCatalog(modeId: number): Promise<CurrentCameraCatalog> {
    const client = this.client;
    if (!client?.ready)
      throw new Error("Connect before loading camera settings.");
    const epoch = this.epoch;
    const generation = client.session.state.generation;
    const abort = new AbortController();
    this.requests.add(abort);
    const timeout = setTimeout(() => abort.abort(), 10_000);
    try {
      const response = await this.fetcher(
        this.url(`http://${this.host}:8082/shootingMode/getParamAndSetting`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modeId }),
          signal: abort.signal,
        },
      );
      if (!response.ok)
        throw new Error(`Camera discovery failed (${response.status}).`);
      const catalog = normalizeCurrentCameraCatalog(
        parseCurrentJsonLossless(await response.text()),
        modeId,
      );
      if (
        epoch !== this.epoch ||
        generation !== client.session.state.generation ||
        !client.ready
      )
        throw new Error("Camera settings belong to a previous connection.");
      this.catalogs.set(modeId, catalog);
      return catalog;
    } finally {
      clearTimeout(timeout);
      this.requests.delete(abort);
    }
  }

  disconnect() {
    this.workspaceSocket?.disposeBorrowed();
    this.workspaceSocket = undefined;
    this.polling = false;
    this.capturePending = false;
    this.captureRevision++;
    this.host = undefined;
    this.profile = undefined;
    this.activity = {};
    this.epoch++;
    this.discovery?.abort();
    this.requests.forEach((request) => request.abort());
    this.requests.clear();
    this.catalogs.clear();
    if (this.poll) clearInterval(this.poll);
    this.poll = undefined;
    this.detach?.();
    this.detach = undefined;
    this.client?.close();
    this.client = undefined;
    this.publish({
      ...offlineRuntime,
      lastSeen: this.snapshot.lastSeen,
      frames: undefined,
      stackedFrames: undefined,
      capturePreviews: undefined,
      streamTypeTele: undefined,
      streamTypeWide: undefined,
      error: undefined,
    });
  }
}
