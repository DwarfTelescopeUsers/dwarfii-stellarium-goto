import { telephotoURL } from "@/lib/dwarf2_api";
import { ConnectionContextType } from "@/types";
import {
  saveConnectionStatusDB,
  saveInitialConnectionTimeDB,
  deleteConnectionDB,
} from "@/db/db_utils";

export function checkConnectionLoop(
  connectionCtx: ConnectionContextType,
  timer: any
) {
  // if we can't connect to camera in 2 seconds, reset connection data
  fetch(telephotoURL, { signal: AbortSignal.timeout(2000) })
    .then(() => {
      console.log("connection ok");
      if (!connectionCtx.connectionStatus) {
        connectionCtx.setConnectionStatus(true);
        saveConnectionStatusDB(true);
        saveInitialConnectionTimeDB();
      }
    })
    .catch((err) => {
      if (err.name === "AbortError") {
        console.log("connection error");
        if (timer) {
          clearInterval(timer);
        }

        connectionCtx.deleteConnection();
        deleteConnectionDB();
      }
    });
}
