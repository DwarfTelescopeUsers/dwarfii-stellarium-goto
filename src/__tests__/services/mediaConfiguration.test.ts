jest.mock("@/services/dwarf/cameraParams", () => ({
  loadV3CameraParameterCatalog: jest.fn(),
  getV3NormalizedCameraCatalog: jest.fn(),
}));
import { submitConfiguredMedia } from "@/services/dwarf/mediaConfiguration";
import {
  loadV3CameraParameterCatalog,
  getV3NormalizedCameraCatalog,
} from "@/services/dwarf/cameraParams";

const load = jest.mocked(loadV3CameraParameterCatalog);
const get = jest.mocked(getV3NormalizedCameraCatalog);
function catalog() {
  return {
    modeId: 1,
    cameras: [
      { cameraId: 0, parameters: [] },
      { cameraId: 1, parameters: [] },
    ],
    sharedParameters: [
      {
        key: "burstCount",
        paramId: "72884426782015509",
        range: { minimum: 3, maximum: 1000, integer: false },
      },
      {
        key: "burstIntervalTime",
        paramId: "72884426782015510",
        options: [0, 1, 2, 3].map((value) => ({ value, label: String(value) })),
      },
      {
        key: "timelapseIntervalTime",
        paramId: "72884426782015513",
        options: [0, 1, 2, 3].map((value) => ({ value, label: String(value) })),
      },
      {
        key: "timelapseTotalTime",
        paramId: "72884426782015514",
        options: [0, 120, 300].map((value) => ({
          value,
          label: String(value),
        })),
      },
    ],
  } as any;
}
function context() {
  return {
    IPDwarf: "192.0.2.1",
    socketIPDwarf: {
      isConnected: () => true,
      session: { state: { generation: 1, snapshot: {} } },
      request: jest.fn(async (operation) => ({
        data:
          operation === "switchShootingMode" || operation === "enterCamera"
            ? { shootingModeId: 1 }
            : operation === "switchShootingTech"
              ? { shootingTechId: 5 }
              : {},
      })),
    },
  } as any;
}
beforeEach(() => {
  jest.resetAllMocks();
  load.mockResolvedValue(undefined);
  get.mockReturnValue(catalog());
});
test.each([0, 1])(
  "time-lapse camera %i configures exact shared IDs then submits selected camera",
  async (cameraId) => {
    const ctx = context();
    await submitConfiguredMedia(cameraId, ctx, "timelapse", 2, 120);
    expect(ctx.socketIPDwarf.request.mock.calls).toEqual([
      ["switchShootingMode", { mode: 1 }],
      ["enterCamera", { clientParam: { encodeType: 1 } }],
      ["switchShootingTech", { tech: 5 }],
      ["setIntegerParameter", { paramId: "72884426782015513", value: 2 }],
      ["setIntegerParameter", { paramId: "72884426782015514", value: 120 }],
      [cameraId ? "startWideTimelapse" : "startTeleTimelapse", {}],
    ]);
  },
);
test("burst count and cadence are actual values, with a canonical count payload", async () => {
  const ctx = context();
  ctx.socketIPDwarf.request.mockImplementation(async (operation) => ({
    data:
      operation === "switchShootingMode" || operation === "enterCamera"
        ? { shootingModeId: 1 }
        : operation === "switchShootingTech"
          ? { shootingTechId: 3 }
          : {},
  }));
  await submitConfiguredMedia(1, ctx, "burst", 7, 2);
  expect(ctx.socketIPDwarf.request.mock.calls.slice(-3)).toEqual([
    ["setIntegerParameter", { paramId: "72884426782015509", value: 7 }],
    ["setIntegerParameter", { paramId: "72884426782015510", value: 2 }],
    ["startWideBurst", { count: 7 }],
  ]);
});
test("unsupported values and missing IDs fail before changing device mode", async () => {
  const ctx = context();
  await expect(
    submitConfiguredMedia(0, ctx, "timelapse", 2, 7),
  ).rejects.toThrow("not advertised");
  expect(ctx.socketIPDwarf.request).not.toHaveBeenCalled();
  get.mockReturnValue({ ...catalog(), sharedParameters: [] });
  await expect(submitConfiguredMedia(0, ctx, "burst", 7, 2)).rejects.toThrow(
    "did not advertise",
  );
  expect(ctx.socketIPDwarf.request).not.toHaveBeenCalled();
});
test("reconnect during discovery prevents every write", async () => {
  const ctx = context();
  load.mockImplementation(async () => {
    ctx.socketIPDwarf.session.state.generation++;
  });
  await expect(
    submitConfiguredMedia(0, ctx, "timelapse", 2, 120),
  ).rejects.toThrow("connection changed");
  expect(ctx.socketIPDwarf.request).not.toHaveBeenCalled();
});
test("a failed configuration step never starts capture", async () => {
  const ctx = context();
  const request = ctx.socketIPDwarf.request.getMockImplementation();
  ctx.socketIPDwarf.request.mockImplementation(async (operation, values) => {
    if (operation === "setIntegerParameter")
      throw new Error("Device rejected setting");
    return request(operation, values);
  });
  await expect(
    submitConfiguredMedia(0, ctx, "timelapse", 2, 120),
  ).rejects.toThrow("Device rejected setting");
  expect(ctx.socketIPDwarf.request).not.toHaveBeenCalledWith(
    "startTeleTimelapse",
    {},
  );
});
