jest.mock("@/services/dwarf", () => ({
  Dwarfii_Api: {
    DwarfCMD: { CMD_SYSTEM_SET_TIME: 13002, CMD_SYSTEM_SET_TIME_ZONE: 13003 },
  },
  messageSystemSetTime: () => new Uint8Array(),
  messageSystemSetTimezone: () => new Uint8Array(),
  messageAstroStartCalibration: jest.fn(() => new Uint8Array()),
}));
import { calibrationHandler } from "@/lib/goto_utils";
import { messageAstroStartCalibration } from "@/services/dwarf";

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

test.each(["page", "generation"])(
  "calibration's delayed commands stop when %s changes",
  async (change) => {
    const abort = new AbortController();
    const socket = {
      isConnected: () => true,
      session: { state: { generation: 1 } },
      currentClient: {},
      prepare: jest.fn(),
      run: jest.fn(() => true),
    };
    const context = {
      IPDwarf: "192.0.2.1",
      socketIPDwarf: socket,
      latitude: 50,
      longitude: 8,
      timezone: "Europe/Berlin",
      setAstroSettings: jest.fn(),
      deviceOperationSignal: abort.signal,
    } as any;
    const pending = calibrationHandler(context, jest.fn(), jest.fn());
    expect(socket.prepare).toHaveBeenCalledTimes(1);
    if (change === "page") abort.abort();
    if (change === "generation") socket.session.state.generation++;
    await jest.advanceTimersByTimeAsync(1000);
    await pending;
    expect(socket.prepare).toHaveBeenCalledTimes(1);
    expect(messageAstroStartCalibration).not.toHaveBeenCalled();
  },
);
