import { ConnectionContextType } from "@/types";
import { saveDebugMessagesDb } from "@/db/db_utils";

export function logger(
  text: string,
  message: { [k: string]: any },
  store: ConnectionContextType
) {
  console.log(text, message);
  if (store.debug) {
    store.setLogger((prev) => prev?.concat(message));
    saveDebugMessagesDb(message);
  }
}
