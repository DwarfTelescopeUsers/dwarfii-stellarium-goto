import { ConnectionContextType } from "@/types";
import { saveLogMessagesDb } from "@/db/db_utils";

export function logger(
  text: string,
  message: { [k: string]: any },
  store: ConnectionContextType
) {
  console.log(text, message);
  if (store.loggerStatus) {
    store.setLogger((prev) => prev?.concat(message));
    saveLogMessagesDb(message);
  }
}
