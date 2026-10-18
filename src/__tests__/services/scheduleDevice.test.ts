jest.mock("@/lib/get_proxy_url", () => ({ getProxyUrl: () => "/api/proxy" }));
jest.mock("@/services/dwarf/cameraParams", () => ({
  loadV3AstroParameterCatalog: jest.fn(),
  getV3NormalizedCameraCatalog: jest.fn(),
}));
import { encodeCurrentParamId } from "dwarfii_api";
import { queueTimedObservation } from "@/services/dwarf/scheduleDevice";
import {
  loadV3AstroParameterCatalog,
  getV3NormalizedCameraCatalog,
} from "@/services/dwarf/cameraParams";

const recipe = {
  name: "M45 timed",
  target: "M45",
  rightAscension: "3.78",
  declination: "24.1",
  startAt: "2033-05-18T03:34:00Z",
  endAt: "2033-05-18T03:44:00Z",
  exposureSeconds: 60,
  gain: 60,
  filter: "dual-band" as const,
  autofocus: true,
  eqMode: false,
  captureDarks: false,
};
const now = Date.parse("2033-05-18T02:00:00Z");
const id = (paramIndex: number) =>
  encodeCurrentParamId({
    shootingMode: 2,
    category: 1,
    cameraId: 0,
    paramIndex,
  });
function setup() {
  let schedules: any[] = [];
  let sequence = 0;
  Object.defineProperty(crypto, "randomUUID", {
    configurable: true,
    value: () => `new-id-${++sequence}`,
  });
  const socket = {
    isConnected: () => true,
    session: { state: { generation: 1, ownership: "control", phase: "ready" } },
    request: jest.fn(
      async (operation: string, values?: Record<string, any>) => {
        if (operation === "syncShootingSchedule")
          schedules = [values?.shootingSchedule];
        return {
          known: true,
          type: 1,
          data:
            operation === "getShootingScheduleById"
              ? { shootingSchedule: schedules[0] }
              : operation === "getAllShootingSchedule"
                ? { shootingSchedule: schedules }
                : { code: 0 },
        } as any;
      },
    ),
  };
  const context = {
    IPDwarf: "192.0.2.1",
    typeIdDwarf: 4,
    socketIPDwarf: socket,
    timezone: "Europe/Berlin",
    latitude: 10,
    longitude: 20,
  } as any;
  global.fetch = jest.fn(async (url) => ({
    ok: true,
    json: async () => ({
      code: 0,
      data: String(url).includes("getDefaultParamsConfig")
        ? { majorVersion: 2, minorVersion: 6 }
        : { deviceId: context.typeIdDwarf, macAddress: "00:11:22:33:44:55" },
    }),
  })) as any;
  jest.mocked(getV3NormalizedCameraCatalog).mockReturnValue({
    modeId: 2,
    cameras: [
      {
        cameraId: 0,
        parameters: [
          {
            key: "exp",
            label: "Exposure",
            source: "special",
            paramId: id(1),
            options: [{ value: 162, label: "60", seconds: 60 }],
          },
          {
            key: "gain",
            label: "Gain",
            source: "special",
            paramId: id(2),
            options: [{ value: 60, label: "60" }],
          },
        ],
      },
    ],
  });
  return { socket, context };
}

beforeEach(() => jest.clearAllMocks());

test("explicit submit verifies native support, physical identity and live choices before writing and confirms the exact new ID", async () => {
  const { socket, context } = setup();
  const result = await queueTimedObservation(context, recipe, now);
  expect(result.scheduleId).toMatch(/^new-id-1\d+\.Android$/);
  expect(loadV3AstroParameterCatalog).toHaveBeenCalledWith(
    "192.0.2.1",
    context,
  );
  expect(socket.request).toHaveBeenNthCalledWith(
    1,
    "setTime",
    expect.objectContaining({ timezoneOffset: 2 }),
  );
  const write = socket.request.mock.calls.find(
    ([operation]) => operation === "syncShootingSchedule",
  );
  expect(write?.[1]?.shootingSchedule).toMatchObject({
    scheduleId: result.scheduleId,
    deviceId: 4,
    macAddress: "00:11:22:33:44:55",
  });
  expect(socket.request).toHaveBeenLastCalledWith("getShootingScheduleById", {
    id: result.scheduleId,
  });
  expect(
    socket.request.mock.calls.some(
      ([operation]) => operation === "replaceShootingSchedule",
    ),
  ).toBe(false);
});

test("fresh D3 creation never calls its broken empty-list handler", async () => {
  const { socket, context } = setup();
  context.typeIdDwarf = 2;
  const result = await queueTimedObservation(context, recipe, now);
  expect(result.schedules[0].deviceId).toBe(2);
  expect(
    socket.request.mock.calls.some(([op]) => op === "getAllShootingSchedule"),
  ).toBe(false);
});

test("observer or changed discovery identity never writes a timed job", async () => {
  const { socket, context } = setup();
  socket.session.state.ownership = "slave";
  await expect(queueTimedObservation(context, recipe, now)).rejects.toThrow(
    "Request control",
  );
  expect(
    socket.request.mock.calls.some(
      ([operation]) => operation === "syncShootingSchedule",
    ),
  ).toBe(false);
  socket.session.state.ownership = "control";
  jest.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => ({
      code: 0,
      data: { deviceId: 2, macAddress: "00:11:22:33:44:66" },
    }),
  } as any);
  await expect(queueTimedObservation(context, recipe, now)).rejects.toThrow(
    "model and physical address",
  );
  expect(
    socket.request.mock.calls.some(
      ([operation]) => operation === "syncShootingSchedule",
    ),
  ).toBe(false);
});

test("an address reused by a different physical Mini during preparation cannot receive the original job", async () => {
  const { socket, context } = setup();
  jest
    .mocked(fetch)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 0,
        data: { deviceId: 4, macAddress: "00:11:22:33:44:55" },
      }),
    } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 0,
        data: { deviceId: 4, macAddress: "00:11:22:33:44:66" },
      }),
    } as any);
  await expect(queueTimedObservation(context, recipe, now)).rejects.toThrow(
    "different physical DWARF",
  );
  expect(
    socket.request.mock.calls.some(
      ([operation]) => operation === "syncShootingSchedule",
    ),
  ).toBe(false);
});

test("leaving the originating page during verification cannot submit a native timed job", async () => {
  const { socket, context } = setup();
  const abort = new AbortController();
  context.deviceOperationSignal = abort.signal;
  jest.mocked(loadV3AstroParameterCatalog).mockImplementationOnce(async () => {
    abort.abort();
  });
  await expect(queueTimedObservation(context, recipe, now)).rejects.toThrow(
    "connection changed",
  );
  expect(
    socket.request.mock.calls.some(
      ([operation]) => operation === "syncShootingSchedule",
    ),
  ).toBe(false);
});
