import { ConnectionContextType } from "@/types";
import { saveLogMessagesDb } from "@/db/db_utils";

export function logger(
  text: string,
  message: { [k: string]: any },
  store: ConnectionContextType,
) {
  console.log(text, message);
  if (store.loggerStatus) {
    store.setLogger((prev) => (prev ?? []).concat(message).slice(-1000));
    try {
      saveLogMessagesDb(message);
    } catch (error) {
      console.warn("Could not persist device log", error);
    }
  }
}
