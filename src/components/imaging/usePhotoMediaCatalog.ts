import { useContext, useEffect, useState } from "react";
import type { CurrentCameraCatalog } from "dwarfii_api";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  loadV3CameraParameterCatalog,
  getV3NormalizedCameraCatalog,
} from "@/services/dwarf/cameraParams";

/** Read-only discovery scoped to the selected physical connection. */
export function usePhotoMediaCatalog() {
  const context = useContext(ConnectionContext);
  const [catalog, setCatalog] = useState<CurrentCameraCatalog>();
  const [error, setError] = useState("");
  const socket = context.socketIPDwarf;
  const ip = context.IPDwarf;
  const generation = socket?.session?.state.generation;
  useEffect(() => {
    let active = true;
    setCatalog(undefined);
    setError("");
    if (!ip || !socket?.isConnected()) {
      setError("Connect to the DWARF to discover capture settings.");
      return;
    }
    void loadV3CameraParameterCatalog(ip, context, 1)
      .then(() => {
        if (active) setCatalog(getV3NormalizedCameraCatalog(1, context));
      })
      .catch((error) => {
        if (active)
          setError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      active = false;
    };
  }, [ip, socket, generation]);
  return { catalog, error };
}
