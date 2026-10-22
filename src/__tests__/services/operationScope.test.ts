import { scheduleDeviceAction } from "@/services/dwarf/operationScope";
import { acquireCaptureOwnership } from "@/services/dwarf/captureOwnership";

function fixture() {
  const abort = new AbortController();
  const socket = {
    isConnected: () => true,
    session: { state: { generation: 1 } },
    currentClient: {},
  };
  const context = {
    IPDwarf: "192.0.2.1",
    socketIPDwarf: socket,
    deviceOperationSignal: abort.signal,
    setDeviceError: jest.fn(),
  } as any;
  return { abort, socket, context };
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test.each(["page", "generation", "client", "socket"])(
  "delayed mount writes stop after originating %s changes",
  async (change) => {
    const { abort, socket, context } = fixture();
    const action = jest.fn();
    for (const delay of [1000, 1500, 2000, 2500, 3000, 3500])
      scheduleDeviceAction(context, delay, action);
    await jest.advanceTimersByTimeAsync(1000);
    expect(action).toHaveBeenCalledTimes(1);
    if (change === "page") abort.abort();
    if (change === "generation") socket.session.state.generation++;
    if (change === "client") socket.currentClient = {};
    if (change === "socket") socket.isConnected = () => false;
    await jest.advanceTimersByTimeAsync(7000);
    expect(action).toHaveBeenCalledTimes(1);
  },
);

test("cancelling calibration preparation leaves another telescope's timers intact", async () => {
  const a = fixture(),
    b = fixture();
  const cancelCalibration = new AbortController();
  const actionA = jest.fn(),
    actionB = jest.fn();
  scheduleDeviceAction(a.context, 7000, actionA, cancelCalibration.signal);
  scheduleDeviceAction(b.context, 7000, actionB);
  cancelCalibration.abort();
  await jest.advanceTimersByTimeAsync(7000);
  expect(actionA).not.toHaveBeenCalled();
  expect(actionB).toHaveBeenCalledTimes(1);
});

test("in-flight action receives the same abort signal for its remaining async steps", async () => {
  const { abort, context } = fixture();
  let scoped: any;
  scheduleDeviceAction(context, 1000, (value) => {
    scoped = value;
  });
  await jest.advanceTimersByTimeAsync(1000);
  expect(scoped.deviceOperationSignal.aborted).toBe(false);
  abort.abort();
  expect(scoped.deviceOperationSignal.aborted).toBe(true);
});

test("a newer same-connection capture cancels delayed restoration only on its device", async () => {
  const a = fixture(),
    b = fixture();
  const actionA = jest.fn(),
    actionB = jest.fn();
  scheduleDeviceAction(a.context, 3500, actionA);
  scheduleDeviceAction(b.context, 3500, actionB);
  const release = acquireCaptureOwnership(a.socket.currentClient);
  release(); // Even a short job must invalidate the older restoration timer.
  await jest.advanceTimersByTimeAsync(4000);
  expect(actionA).not.toHaveBeenCalled();
  expect(actionB).toHaveBeenCalledTimes(1);
});

test("releasing an old capture twice does not unlock its replacement", () => {
  const client = {};
  const old = acquireCaptureOwnership(client);
  old();
  const replacement = acquireCaptureOwnership(client);
  old();
  expect(() => acquireCaptureOwnership(client)).toThrow(/already owns/);
  replacement();
});
