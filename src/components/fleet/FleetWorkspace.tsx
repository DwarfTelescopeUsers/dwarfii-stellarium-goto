import {
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  ConnectionContext,
  ConnectionContextProvider,
} from "@/stores/ConnectionContext";
import { useFleet, useFleetRegistry } from "@/stores/FleetContext";
import { offlineRuntime } from "@/services/fleet/controller";
import { getDwarfDeviceName } from "@/services/dwarf/deviceProfile";
import type { ConnectionContextType } from "@/types";
import type { WebSocketHandler } from "@/services/dwarf/connection";

const noopSubscribe = () => () => {};
const getOffline = () => offlineRuntime;

export function useSelectedFleetDevice() {
  const manager = useFleet();
  const registry = useFleetRegistry();
  const device = registry.selectedDeviceId
    ? registry.devices[registry.selectedDeviceId]
    : undefined;
  const controller = device ? manager.getDevice(device.id) : undefined;
  const runtime = useSyncExternalStore(
    controller?.subscribe ?? noopSubscribe,
    controller?.getSnapshot ?? getOffline,
    getOffline,
  );
  return { manager, registry, device, controller, runtime };
}

function DeviceScope({
  shared,
  children,
}: {
  shared: ConnectionContextType;
  children: ReactNode;
}) {
  const local = useContext(ConnectionContext);
  const { device, controller, runtime } = useSelectedFleetDevice();
  const { pathname } = useRouter();
  const [operationScope, setOperationScope] = useState<AbortController>();
  useEffect(() => {
    const abort = new AbortController();
    setOperationScope(abort);
    return () => abort.abort();
  }, [controller, runtime.generation, pathname]);
  const profile = controller?.getProfile();
  const [socket, setSocket] = useState<WebSocketHandler>();
  useEffect(() => {
    setSocket(controller?.getWorkspaceSocket());
    return () => controller?.releaseWorkspaceSocket();
  }, [controller, runtime.generation]);
  const telemetry = runtime.telemetry;
  const value: ConnectionContextType = {
    ...local,
    logger: shared.logger,
    setLogger: shared.setLogger,
    loggerStatus: shared.loggerStatus,
    setLoggerStatus: shared.setLoggerStatus,
    loggerView: shared.loggerView,
    setLoggerView: shared.setLoggerView,
    deviceOperationSignal: operationScope?.signal,
    latitude: shared.latitude,
    longitude: shared.longitude,
    timezone: shared.timezone,
    proxyIP: shared.proxyIP,
    proxyLocalIP: shared.proxyLocalIP,
    proxyInLan: shared.proxyInLan,
    useHttps: shared.useHttps,
    IPStellarium: shared.IPStellarium,
    portStellarium: shared.portStellarium,
    urlStellarium: shared.urlStellarium,
    connectionStatusStellarium: shared.connectionStatusStellarium,
    IPDwarf: controller?.getConnectionHost() ?? device?.lastKnownHost,
    socketIPDwarf: socket,
    sessionPreviewCameras: runtime.capturePreviews,
    typeIdDwarf: profile?.hardwareId ?? 0,
    typeNameDwarf: profile ? getDwarfDeviceName(profile.hardwareId) : "DWARF",
    typeUidDwarf: device?.id ?? "",
    connectionStatus: runtime.connection === "connected",
    connectionStatusSlave: runtime.ownership !== "control",
    streamTypeTeleDwarf: runtime.streamTypeTele,
    streamTypeWideDwarf: runtime.streamTypeWide,
    BatteryLevelDwarf: telemetry.batteryPercentage,
    BatteryStatusDwarf: telemetry.chargingState ?? 0,
    statusTemperatureDwarf: telemetry.temperature,
    availableSizeDwarf: telemetry.storageValid
      ? telemetry.availableSize
      : undefined,
    totalSizeDwarf: telemetry.storageValid ? telemetry.totalSize : undefined,
    imagingSession: {
      ...local.imagingSession,
      isRecording: runtime.activity === "capturing",
      imagesTaken: runtime.frames ?? 0,
      imagesStacked: runtime.stackedFrames ?? 0,
    },
    deviceError: runtime.error ?? local.deviceError,
  };
  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

/** Selection changes page state, never transport ownership. Setup remains independent. */
export default function FleetWorkspace({ children }: { children: ReactNode }) {
  const shared = useContext(ConnectionContext);
  const { registry, device, runtime } = useSelectedFleetDevice();
  const path = useRouter().pathname;
  if (["/setup-scope", "/fleet"].includes(path)) return <>{children}</>;
  const needsDevice = ["/", "/cameras", "/objects", "/image-session"].includes(
    path,
  );
  // Isolate all device-aware pages once Fleet is configured. Never fall back to
  // the last Setup telescope when a Fleet selection is absent or disconnected.
  if (!Object.keys(registry.devices).length && !needsDevice)
    return <>{children}</>;
  return (
    <ConnectionContextProvider key={device?.id ?? "no-device"}>
      <DeviceScope shared={shared}>
        {needsDevice && !device ? (
          <div className="dw-page">
            <h1>Select a telescope</h1>
            <p>
              Connect a telescope in Fleet, then select its card in the top bar
              to use this workspace.
            </p>
            <Link href="/fleet">Manage your fleet</Link>
          </div>
        ) : needsDevice &&
          path !== "/" &&
          runtime.connection !== "connected" ? (
          <div className="dw-page">
            <h1>{device?.alias}</h1>
            <p>
              This telescope is {runtime.connection}. Connect it in Fleet before
              using this feature.
            </p>
            <Link href="/fleet">Open Fleet</Link>
          </div>
        ) : (
          children
        )}
      </DeviceScope>
    </ConnectionContextProvider>
  );
}
