import type { ConnectionContextType } from "@/types";
import { captureOwnershipRevision } from "./captureOwnership";

/** Capture origin once, before delays or HTTP work can outlive a workspace. */
export function deviceOperationIsCurrent(context: ConnectionContextType) {
  const socket = context.socketIPDwarf;
  const host = context.IPDwarf;
  const generation = socket?.session?.state.generation;
  const client = socket?.currentClient;
  const captureRevision = captureOwnershipRevision(client);
  const signal = context.deviceOperationSignal;
  return () =>
    !signal?.aborted &&
    Boolean(socket?.isConnected()) &&
    context.socketIPDwarf === socket &&
    context.IPDwarf === host &&
    socket?.session?.state.generation === generation &&
    socket?.currentClient === client &&
    captureOwnershipRevision(client) === captureRevision;
}

export function scheduleDeviceAction(
  context: ConnectionContextType,
  delayMs: number,
  action: (scoped: ConnectionContextType) => unknown,
  signal?: AbortSignal,
) {
  const signals = [context.deviceOperationSignal, signal].filter(
    (value): value is AbortSignal => value !== undefined,
  );
  const scoped = {
    ...context,
    deviceOperationSignal: signals.length
      ? AbortSignal.any(signals)
      : undefined,
  };
  const current = deviceOperationIsCurrent(scoped);
  let timer: ReturnType<typeof setTimeout>;
  const cancel = () => {
    clearTimeout(timer);
    scoped.deviceOperationSignal?.removeEventListener("abort", cancel);
  };
  if (!current()) return cancel;
  timer = setTimeout(() => {
    cancel();
    if (!current()) return;
    void Promise.resolve()
      .then(() => {
        if (current()) return action(scoped);
      })
      .catch((error) => {
        if (current())
          context.setDeviceError?.(
            error instanceof Error ? error.message : String(error),
          );
      });
  }, delayMs);
  scoped.deviceOperationSignal?.addEventListener("abort", cancel, {
    once: true,
  });
  return cancel;
}
