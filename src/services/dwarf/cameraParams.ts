import type { ConnectionContextType } from "@/types";
import { getProxyUrl } from "@/lib/get_proxy_url";
import { allowedGains } from "@/lib/data_utils";
import { allowedWideGains } from "@/lib/data_wide_utils";
import {
  decodeCurrentParamId,
  getCurrentProfile,
  normalizeCurrentParamId,
  parseCurrentJsonLossless,
  sameCurrentParameterAcrossModes,
  type CurrentCameraCatalog,
  type CurrentCatalogParameter,
  type CurrentSession,
} from "./api";
import { normalizeDeviceCameraCatalog as normalizeCurrentCameraCatalog } from "./catalog";

export type V3ParameterValue = {
  paramId: string;
  value: number;
  mode?: number;
};
export type V3CameraSettingSummary = {
  cameraId: number;
  settings: { label: string; value: string }[];
};
type CatalogScope = {
  ip: string;
  socket: unknown;
  session?: CurrentSession;
  generation?: number;
};
class CameraParameterCache {
  scope?: CatalogScope;
  unsubscribe?: () => void;
  epoch = 0;
  raw = new Map<number, unknown>();
  normalized = new Map<number, CurrentCameraCatalog>();
  pending = new Map<number, Promise<unknown>>();
  namespaces = new Map<number, number>();
  requests = new Set<AbortController>();

  reset() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.scope = undefined;
    this.epoch++;
    this.requests.forEach((request) => request.abort());
    this.requests.clear();
    this.raw.clear();
    this.normalized.clear();
    this.pending.clear();
    this.namespaces.clear();
  }
}

// React context objects change between renders. The owned socket is the stable
// key; IP alone cannot distinguish a new connection from an old one.
const caches = new WeakMap<object, CameraParameterCache>();
function cacheFor(
  context?: ConnectionContextType,
): CameraParameterCache | undefined {
  if (!context) return undefined;
  const key = context.socketIPDwarf ?? context;
  let cache = caches.get(key);
  if (!cache) {
    cache = new CameraParameterCache();
    caches.set(key, cache);
  }
  return cache;
}

/** Reset only the originating device. No implicit global/selected cache. */
export function resetV3CameraParameterCache(
  context?: ConnectionContextType,
): void {
  cacheFor(context)?.reset();
}

function synchronizeScope(
  ip: string,
  connectionCtx: ConnectionContextType,
): CameraParameterCache {
  const cache = cacheFor(connectionCtx)!;
  const socket = connectionCtx.socketIPDwarf;
  const session: CurrentSession | undefined = socket?.session;
  const next = { ip, socket, session, generation: session?.state.generation };
  if (
    cache.scope?.ip === next.ip &&
    cache.scope?.socket === next.socket &&
    cache.scope?.session === next.session &&
    cache.scope?.generation === next.generation
  )
    return cache;
  cache.reset();
  cache.scope = next;
  if (session) {
    cache.unsubscribe = session.subscribe((state) => {
      if (
        state.generation !== next.generation ||
        state.phase === "disconnected"
      )
        cache.reset();
    });
  }
  return cache;
}

function checkCurrentScope(
  connectionCtx?: ConnectionContextType,
): CameraParameterCache | undefined {
  if (!connectionCtx) return undefined;
  const cache = connectionCtx.IPDwarf
    ? synchronizeScope(connectionCtx.IPDwarf, connectionCtx)
    : cacheFor(connectionCtx)!;
  const scope = cache.scope;
  if (
    !connectionCtx.IPDwarf ||
    (scope?.session &&
      (scope.session.state.generation !== scope.generation ||
        scope.session.state.phase === "disconnected"))
  )
    cache.reset();
  return cache;
}

/** Display current reported labels, never model-static explanatory values. */
export function summarizeV3CameraCatalog(
  catalog: unknown,
): V3CameraSettingSummary[] {
  if (!catalog) return [];
  try {
    const normalized =
      typeof catalog === "object" && catalog !== null && "cameras" in catalog
        ? (catalog as CurrentCameraCatalog)
        : normalizeCurrentCameraCatalog(catalog, 2);
    return normalized.cameras.map((camera) => ({
      cameraId: camera.cameraId,
      settings: [...camera.parameters]
        .sort(
          (first, second) =>
            Number(first.source === "special") -
            Number(second.source === "special"),
        )
        .filter((parameter) => parameter.currentValue !== undefined)
        .map((parameter) => ({
          label: parameter.label,
          value: parameter.currentLabel ?? String(parameter.currentValue),
        })),
    }));
  } catch {
    return [];
  }
}

/** SDK owns discovery parsing/legal values; this layer owns request scope. */
export async function loadV3CameraParameterCatalog(
  ip: string,
  connectionCtx: ConnectionContextType,
  modeId: number,
): Promise<unknown> {
  if (connectionCtx.IPDwarf && connectionCtx.IPDwarf !== ip)
    throw new Error(
      "Camera discovery address does not match this device context.",
    );
  const cache = synchronizeScope(ip, connectionCtx);
  const pending = cache.pending.get(modeId);
  if (pending) return pending;
  const epoch = cache.epoch;
  const scope = cache.scope;
  const abort = new AbortController();
  cache.requests.add(abort);
  const timeout = setTimeout(() => abort.abort(), 10_000);
  const request = (async () => {
    const target = "http://" + ip + ":8082/shootingMode/getParamAndSetting";
    const response = await fetch(
      getProxyUrl(connectionCtx) + "?target=" + encodeURIComponent(target),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modeId }),
        signal: abort.signal,
      },
    );
    if (!response.ok)
      throw new Error(
        "Camera parameter discovery failed (" + response.status + ")",
      );
    const raw = parseCurrentJsonLossless(await response.text());
    const normalized = normalizeCurrentCameraCatalog(raw, modeId);
    if (
      epoch !== cache.epoch ||
      scope !== cache.scope ||
      scope?.session?.state.generation !== scope?.generation
    ) {
      throw new Error("Camera discovery belongs to a previous connection.");
    }
    cache.raw.set(modeId, raw);
    cache.normalized.set(modeId, normalized);
    return raw;
  })();
  cache.pending.set(modeId, request);
  try {
    return await request;
  } finally {
    clearTimeout(timeout);
    cache.requests.delete(abort);
    if (cache.pending.get(modeId) === request) cache.pending.delete(modeId);
  }
}

export function loadV3AstroParameterCatalog(
  ip: string,
  connectionCtx: ConnectionContextType,
): Promise<unknown> {
  return loadV3CameraParameterCatalog(ip, connectionCtx, 2);
}

/** Compatibility accessor keeps the raw response shape with lossless string IDs. */
export function getV3AstroParameterCatalog(
  connectionCtx?: ConnectionContextType,
): unknown {
  return checkCurrentScope(connectionCtx)?.raw.get(2);
}
export function getV3NormalizedCameraCatalog(
  modeId = 2,
  connectionCtx?: ConnectionContextType,
): CurrentCameraCatalog | undefined {
  return checkCurrentScope(connectionCtx)?.normalized.get(modeId);
}
export function getV3CameraParameterOptions(
  cameraId: number,
  key: string,
  modeId = 2,
  connectionCtx?: ConnectionContextType,
): CurrentCatalogParameter | undefined {
  return getV3NormalizedCameraCatalog(modeId, connectionCtx)
    ?.cameras.find((camera) => camera.cameraId === cameraId)
    ?.parameters.find((parameter) => parameter.key === key);
}
export function getV3ActiveParameterNamespace(
  cameraId: number,
  connectionCtx?: ConnectionContextType,
): number | undefined {
  return checkCurrentScope(connectionCtx)?.namespaces.get(cameraId);
}

/** Only for canonical 15264 payloads: omitted non-optional proto3 value means zero. */
export function ingestV3ParameterNotification(
  data: { paramId?: string | number; value?: number; mode?: number },
  connectionCtx?: ConnectionContextType,
): V3ParameterValue | undefined {
  checkCurrentScope(connectionCtx);
  if (data.paramId === undefined) return undefined;
  const value = data.value ?? 0;
  if (
    !Number.isSafeInteger(value) ||
    (data.mode !== undefined && !Number.isSafeInteger(data.mode))
  )
    return undefined;
  try {
    const result = {
      paramId: normalizeCurrentParamId(data.paramId),
      value,
      mode: data.mode ?? 0,
    };
    return result;
  } catch {
    return undefined;
  }
}

export function applyAuthoritativeCameraParam(
  connectionCtx: ConnectionContextType,
  parameter: V3ParameterValue,
): void {
  const cache = checkCurrentScope(connectionCtx)!;
  if (!connectionCtx.IPDwarf || !Number.isSafeInteger(parameter.value)) return;
  const decoded = decodeCurrentParamId(parameter.paramId);
  if (![0, 1].includes(decoded.cameraId) || decoded.reserved !== "0") return;
  if (decoded.shootingMode !== 2) {
    // Runtime namespaces are accepted only when reported and matching a
    // discovered astronomy parameter for the same camera/category/index.
    if (![11, 13].includes(decoded.shootingMode)) return;
    const known = cache.normalized
      .get(2)
      ?.cameras.find((camera) => camera.cameraId === decoded.cameraId)
      ?.parameters.some(
        (entry) =>
          entry.paramId !== undefined &&
          sameCurrentParameterAcrossModes(entry.paramId, parameter.paramId),
      );
    if (!known) return;
    cache.namespaces.set(decoded.cameraId, decoded.shootingMode);
  }
  if (decoded.category === 1 && decoded.paramIndex === 1) {
    connectionCtx.setAstroSettings((current) => ({
      ...current,
      ...(decoded.cameraId === 0
        ? { exposure: parameter.value }
        : { wideExposure: parameter.value }),
    }));
  } else if (decoded.category === 1 && decoded.paramIndex === 2) {
    const options =
      decoded.cameraId === 0
        ? allowedGains[connectionCtx.typeIdDwarf!]?.values
        : allowedWideGains[connectionCtx.typeIdDwarf!]?.values;
    const uiValue = options?.find(
      (option) => Number(option.name) === parameter.value,
    )?.index;
    if (uiValue === undefined) return;
    connectionCtx.setAstroSettings((current) => ({
      ...current,
      ...(decoded.cameraId === 0 ? { gain: uiValue } : { wideGain: uiValue }),
    }));
  } else if (
    decoded.category === 2 &&
    decoded.paramIndex === 16 &&
    decoded.cameraId === connectionCtx.currentAstroCamera
  ) {
    connectionCtx.setAstroSettings((current) => ({
      ...current,
      count: parameter.value,
    }));
  }
}

/** Legacy UI selects by list position; translate semantic label, not Mini index+1. */
export function resolveScienceFilterIndex(
  hardwareId: number,
  uiIndex: number,
): number {
  const uiLabels: Record<number, readonly string[]> = {
    1: ["IR cut", "IR pass"],
    2: ["VIS", "Astro", "Duo-Band"],
    4: ["Astro", "Duo-Band"],
  };
  if (!Number.isInteger(uiIndex) || uiIndex < 0)
    throw new Error("Select a supported science filter.");
  const label = uiLabels[hardwareId]?.[uiIndex];
  const filter = getCurrentProfile(hardwareId).scienceFilters.find(
    (option) => option.label === label,
  );
  if (!filter)
    throw new Error(
      "This science filter is not supported by the connected DWARF.",
    );
  return filter.index;
}
