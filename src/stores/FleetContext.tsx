import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { FleetManager } from "@/services/fleet/manager";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { getProxyUrl } from "@/lib/get_proxy_url";
import { logger } from "@/lib/logger";

const FleetContext = createContext<FleetManager | undefined>(undefined);

export function FleetProvider({ children }: { children: ReactNode }) {
  const [manager] = useState(() => new FleetManager());
  const connection = useContext(ConnectionContext);
  const currentConnection = useRef(connection);
  currentConnection.current = connection;
  const [error, setError] = useState<string>();
  useEffect(() => {
    manager.setPacketListener((id, packet) => {
      const context = currentConnection.current;
      if (!context.loggerStatus) return;
      logger(
        "Fleet device response",
        {
          timestamp: new Date().toISOString(),
          deviceId: id,
          host: manager.getDevice(id).getConnectionHost(),
          moduleId: packet.moduleId,
          cmd: packet.cmd,
          type: packet.type,
          data: packet.data,
        },
        context,
      );
    });
    return () => manager.setPacketListener(undefined);
  }, [manager]);
  useEffect(() => {
    try {
      manager.initialize(localStorage, setError, sessionStorage);
      void manager.restoreConnections(getProxyUrl(connection));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
    return () => manager.dispose();
  }, [manager]); // Restore once per browser document, not on context updates.
  return (
    <FleetContext.Provider value={manager}>
      {error && (
        <div role="alert" className="alert alert-warning">
          {error}
        </div>
      )}
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const manager = useContext(FleetContext);
  if (!manager) throw new Error("FleetProvider is required.");
  return manager;
}

export function useFleetRegistry() {
  const { registry } = useFleet();
  return useSyncExternalStore(
    registry.subscribe,
    registry.getSnapshot,
    registry.getSnapshot,
  );
}

export function useFleetHostGuard() {
  const manager = useContext(FleetContext);
  return (host?: string) => {
    if (!manager || !host) return false;
    const existing = manager.getActiveDeviceAtHost(host);
    if (!existing) return false;
    manager.registry.select(existing.id);
    return true;
  };
}
