import type { ConnectionContextType } from "@/types";
import { saveIPConnectDB } from "@/db/db_utils";

/** Close only the Setup workspace transport. Never stop an on-device job. */
export async function disconnectSetupDevice(context: ConnectionContextType) {
  await context.socketIPDwarf?.cleanup(true);
  saveIPConnectDB("");
  context.setConnectionStatus(false);
  context.setConnectionStatusSlave(false);
}
