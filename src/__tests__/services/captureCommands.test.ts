import { requestCaptureCommand } from "@/services/dwarf/captureCommands";
import {
  CurrentProtocolError,
  type CurrentWebSocketHandler,
} from "dwarfii_api";

function harness() {
  let listener: (state: any, packet?: any) => void = () => {};
  const session = {
    state: { generation: 1, phase: "ready", ownership: "control" },
  };
  const requests: { resolve: (v: any) => void; reject: (e: any) => void }[] =
    [];
  const client = {
    ready: true,
    session,
    subscribe: (fn: typeof listener) => {
      listener = fn;
      return () => {};
    },
    request: jest.fn(
      () =>
        new Promise<any>((resolve, reject) =>
          requests.push({ resolve, reject }),
        ),
    ),
  };
  return {
    client: client as unknown as CurrentWebSocketHandler,
    requests,
    emit: (cmd: number, data = {}, type = 2) =>
      listener({ session: session.state }, { known: true, cmd, type, data }),
    disconnect: () =>
      listener({
        session: { ...session.state, phase: "disconnected", generation: 2 },
      }),
  };
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
test("start resolves from the matching camera notification, not stale progress", async () => {
  const h = harness();
  let resolved = false;
  const promise = requestCaptureCommand(h.client, "startTeleCapture").then(
    (p) => {
      resolved = true;
      return p;
    },
  );
  h.emit(15236, { state: 1 });
  h.emit(15209, { currentCount: 226 });
  await Promise.resolve();
  expect(resolved).toBe(false);
  h.emit(15208, { state: 1 });
  expect((await promise).cmd).toBe(15208);
  h.requests[0].reject(new Error("late SDK timeout"));
  await Promise.resolve();
  await expect(
    requestCaptureCommand(h.client, "startTeleCapture"),
  ).rejects.toThrow("existing capture");
});
test("Stop cancels pending start and completes on stopped notification without ACK", async () => {
  const h = harness();
  const start = requestCaptureCommand(h.client, "startTeleCapture");
  const rejected = expect(start).rejects.toThrow("cancelled");
  const stop = requestCaptureCommand(h.client, "stopTeleCapture");
  h.emit(15208, { state: 3 });
  await rejected;
  expect((await stop).cmd).toBe(15208);
});
test("warnings require explicit continuation on the same device", async () => {
  const a = harness(),
    b = harness();
  const start = requestCaptureCommand(a.client, "startTeleCapture");
  const rejected = expect(start).rejects.toThrow("dark frame");
  a.emit(11005, { code: -11503 }, 1);
  await rejected;
  expect(a.client.request).toHaveBeenCalledTimes(1);
  await expect(
    requestCaptureCommand(b.client, "continueCapture"),
  ).rejects.toThrow("no current");
  const continued = requestCaptureCommand(a.client, "continueCapture");
  a.emit(15208, { state: 1 });
  await continued;
  expect(a.client.request).toHaveBeenLastCalledWith(
    "continueCapture",
    {},
    60000,
  );
});
test("late blocking warning after start notification remains actionable", async () => {
  const h = harness();
  const start = requestCaptureCommand(h.client, "startTeleCapture");
  h.emit(15208, { state: 1 });
  await start;
  h.emit(11005, { code: -11530 }, 1);
  const continued = requestCaptureCommand(h.client, "continueCapture");
  h.requests[1].resolve({ cmd: 11050, data: {} });
  await continued;
});
test("disconnect rejects pending operation and invalidates continuation", async () => {
  const h = harness();
  const start = requestCaptureCommand(h.client, "startTeleCapture");
  const rejected = expect(start).rejects.toThrow("connection or control");
  h.disconnect();
  await rejected;
  h.requests[0].reject(
    new CurrentProtocolError("device", "old warning", -11503),
  );
  await Promise.resolve();
  await expect(
    requestCaptureCommand(h.client, "continueCapture"),
  ).rejects.toThrow("no current");
});
test("fatal errors and missing evidence fail instead of fabricating success", async () => {
  const h = harness();
  const start = requestCaptureCommand(h.client, "startTeleCapture");
  const failure = expect(start).rejects.toThrow("failed");
  h.requests[0].reject(new Error("failed"));
  await failure;
  const retry = requestCaptureCommand(h.client, "startTeleCapture");
  const timeout = expect(retry).rejects.toThrow("No capture acknowledgement");
  jest.advanceTimersByTime(60000);
  await timeout;
});
