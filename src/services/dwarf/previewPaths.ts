import { getIpServerMTX, getProxyUrl } from "@/lib/get_proxy_url";
import type { ConnectionContextType } from "@/types";

export function devicePreviewPath(host: string, camera: "tele" | "wide") {
  if (
    !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) ||
    host
      .split(".")
      .some((part) => Number(part) > 255 || part !== String(Number(part)))
  )
    throw new Error("A valid telescope address is required for preview.");
  return `dwarf_${host.replaceAll(".", "_")}_${camera}`;
}

/** Each telescope has its own MediaMTX paths, including across browser tabs. */
export async function ensureDevicePreviewPaths(
  context: ConnectionContextType,
  signal?: AbortSignal,
) {
  const host = context.IPDwarf;
  if (!host) throw new Error("Select a connected telescope first.");
  const socket = context.socketIPDwarf;
  const generation = socket?.session?.state.generation;
  const connected = socket?.isConnected();
  const check = () => {
    if (
      signal?.aborted ||
      context.IPDwarf !== host ||
      context.socketIPDwarf !== socket ||
      (socket?.IPDwarf !== undefined && socket.IPDwarf !== host) ||
      socket?.session?.state.generation !== generation ||
      (connected && !socket?.isConnected())
    )
      throw new Error(
        "Preview connection changed. Open the selected device again.",
      );
  };
  const proxy = getProxyUrl(context);
  const server = getIpServerMTX();
  await Promise.all(
    (["tele", "wide"] as const).map(async (camera) => {
      const name = devicePreviewPath(host, camera);
      const source = `rtsp://${host}:554/ch${camera === "tele" ? 0 : 1}/stream0`;
      const url = (action: string) =>
        `${proxy}?target=${encodeURIComponent(`http://${server}:9997/v3/config/paths/${action}/${name}`)}`;
      const matches = async (response: Response) => {
        if (!response.ok) return false;
        const config = await response.json();
        check();
        return config?.source === source;
      };
      check();
      const response = await fetch(url("get"), {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
          : AbortSignal.timeout(5000),
      });
      check();
      if (await matches(response)) return;
      if (!response.ok && response.status !== 404)
        throw new Error(
          `Preview configuration unavailable (${response.status}).`,
        );
      check();
      const update = await fetch(
        url(response.status === 404 ? "add" : "replace"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source,
            sourceOnDemand: true,
            sourceOnDemandCloseAfter: "10s",
            record: false,
          }),
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
            : AbortSignal.timeout(5000),
        },
      );
      check();
      // Another tab can create this same host-bound path after our 404. Verify
      // the resulting source before accepting an add conflict or an ACK.
      if (
        !update.ok &&
        !(response.status === 404 && [400, 409].includes(update.status))
      )
        throw new Error(
          `Could not configure ${camera} preview (${update.status}).`,
        );
      const verified = await fetch(url("get"), {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
          : AbortSignal.timeout(5000),
      });
      check();
      if (!(await matches(verified)))
        throw new Error(
          `The ${camera} preview source was not confirmed for this telescope.`,
        );
    }),
  );
}
