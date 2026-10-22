import { useContext, useEffect, useRef } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { getProxyUrl } from "@/lib/get_proxy_url";
import {
  saveConnectionStatusDB,
  saveConnectionStatusStellariumDB,
} from "@/db/db_utils";
import { connectionHandler } from "@/lib/connect_utils";

/** Restore user intent once. Only the owned WebSocket session can establish
 * actual DWARF readiness; HTTP reachability is not protocol connectivity. */
export function useSetupConnection(restoreDevice = true) {
  const connectionCtx = useContext(ConnectionContext);
  const latestContext = useRef(connectionCtx);
  latestContext.current = connectionCtx;
  const restoringConnection = useRef(false);

  useEffect(() => {
    const ip = connectionCtx.IPDwarf;
    if (
      !restoreDevice ||
      !ip ||
      connectionCtx.connectionStatus !== true ||
      restoringConnection.current ||
      connectionCtx.socketIPDwarf?.isConnected()
    )
      return;
    restoringConnection.current = true;
    const context = latestContext.current;
    const finish = (restoring: boolean) => {
      restoringConnection.current = restoring;
    };
    const fail = (message: string) => {
      if (!message) return;
      restoringConnection.current = false;
      context.setConnectionStatus(false);
      saveConnectionStatusDB(false);
    };
    void connectionHandler(
      context,
      ip,
      true,
      finish,
      context.setConnectionStatusSlave,
      () => undefined,
      fail,
    ).catch((error) =>
      fail(error instanceof Error ? error.message : String(error)),
    );
  }, [
    restoreDevice,
    connectionCtx.IPDwarf,
    connectionCtx.connectionStatus,
    connectionCtx.socketIPDwarf,
  ]);

  // Stellarium is an independent HTTP integration. Always dispose timers/fetches.
  useEffect(() => {
    if (
      !connectionCtx.connectionStatusStellarium ||
      !connectionCtx.IPStellarium
    )
      return;
    let disposed = false;
    let failures = 0;
    let activeRequest: AbortController | undefined;
    const check = async () => {
      if (activeRequest) return;
      const context = latestContext.current;
      let url = `http://${context.IPStellarium}:${context.portStellarium}`;
      if (context.proxyIP)
        url = `${getProxyUrl(context)}?target=${encodeURIComponent(url)}`;
      const controller = new AbortController();
      activeRequest = controller;
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Stellarium HTTP ${response.status}`);
        failures = 0;
      } catch {
        if (disposed) return;
        failures += 1;
        if (failures >= 5) {
          context.setConnectionStatusStellarium(false);
          saveConnectionStatusStellariumDB(false);
        }
      } finally {
        clearTimeout(timeout);
        activeRequest = undefined;
      }
    };
    const timer = setInterval(() => {
      void check();
    }, 90_000);
    return () => {
      disposed = true;
      activeRequest?.abort();
      clearInterval(timer);
    };
  }, [
    connectionCtx.connectionStatusStellarium,
    connectionCtx.IPStellarium,
    connectionCtx.portStellarium,
  ]);
}
