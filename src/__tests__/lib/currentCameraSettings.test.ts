jest.mock("@/services/dwarf/cameraParams", () => ({
  loadV3CameraParameterCatalog: jest.fn(),
  getV3NormalizedCameraCatalog: jest.fn(),
  applyAuthoritativeCameraParam: jest.fn(),
  resolveScienceFilterIndex: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({ logger: jest.fn() }));

import {
  getTeleAllParamsFn,
  setWideAllParamsFn,
  turnOnTeleCameraFn,
  updateTelescopeISPSetting,
} from "@/lib/dwarf_utils";
import {
  loadV3CameraParameterCatalog,
  getV3NormalizedCameraCatalog,
} from "@/services/dwarf/cameraParams";

const load = jest.mocked(loadV3CameraParameterCatalog);
const getCatalog = jest.mocked(getV3NormalizedCameraCatalog);
const exposureId = "144396663052566529";

function context(model = 4) {
  return {
    IPDwarf: "192.0.2.1",
    typeIdDwarf: model,
    socketIPDwarf: {
      isConnected: jest.fn(() => true),
      request: jest.fn().mockResolvedValue({ data: {} }),
      session: { state: { generation: 1, snapshot: {} } },
    },
    astroSettings: { exposure: 120 },
    setDeviceError: jest.fn(),
    setCameraTeleSettings: jest.fn(),
    setCameraWideSettings: jest.fn(),
  } as any;
}

beforeEach(() => {
  jest.resetAllMocks();
  load.mockResolvedValue(undefined);
  getCatalog.mockReturnValue({
    modeId: 2,
    cameras: [
      {
        cameraId: 0,
        parameters: [
          {
            key: "exp",
            label: "Exposure",
            source: "special",
            paramId: exposureId,
            currentValue: 120,
            options: [{ value: 120, label: "1 s", seconds: 1 }],
          },
        ],
      },
    ],
  });
});

test.each([2, 4])(
  "model %i uses advertised exposure ID and firmware index",
  async (model) => {
    const ctx = context(model);
    await updateTelescopeISPSetting("exposure", 120, ctx);
    expect(ctx.socketIPDwarf.request).toHaveBeenCalledWith("setExposure", {
      paramId: exposureId,
      value: 120,
      mode: 1,
    });
  },
);

test("unadvertised exposure never reaches the transport", async () => {
  const ctx = context();
  await updateTelescopeISPSetting("exposure", 999, ctx);
  expect(ctx.socketIPDwarf.request).not.toHaveBeenCalled();
  expect(ctx.setDeviceError).toHaveBeenCalledWith(
    expect.stringContaining("not advertised"),
  );
});

test("reconnection during discovery cancels the pending setting", async () => {
  const ctx = context();
  load.mockImplementation(async () => {
    ctx.socketIPDwarf.session.state.generation++;
  });
  await updateTelescopeISPSetting("exposure", 120, ctx);
  expect(ctx.socketIPDwarf.request).not.toHaveBeenCalled();
  expect(ctx.setDeviceError).toHaveBeenCalledWith(
    expect.stringContaining("reconnected"),
  );
});

test("omitted proto3 mode means photo, but no snapshot is not a mode", async () => {
  const ctx = context();
  await getTeleAllParamsFn(ctx);
  expect(load).toHaveBeenCalledWith(ctx.IPDwarf, ctx, 0);
  load.mockClear();
  ctx.socketIPDwarf.session.state.snapshot = undefined;
  await getTeleAllParamsFn(ctx);
  expect(load).not.toHaveBeenCalled();
  expect(ctx.setDeviceError).toHaveBeenCalledWith(
    expect.stringContaining("not reported"),
  );
});

test("preview entry does not switch shooting mode", async () => {
  const ctx = context();
  const status = jest.fn();
  await turnOnTeleCameraFn(ctx, status);
  expect(ctx.socketIPDwarf.request.mock.calls).toEqual([
    ["enterCamera", { clientParam: { encodeType: 1 } }],
    ["telePreviewQuality", { level: 1 }],
  ]);
  expect(status).toHaveBeenCalledWith("on");
});

test("slave preview sends no camera mutations", async () => {
  const ctx = context();
  ctx.connectionStatusSlave = true;
  await turnOnTeleCameraFn(ctx);
  expect(ctx.socketIPDwarf.request).not.toHaveBeenCalled();
});

test("a rejected preview is displayed and never marked on", async () => {
  const ctx = context();
  ctx.socketIPDwarf.request.mockRejectedValue(new Error("Ownership lost"));
  const status = jest.fn();
  await turnOnTeleCameraFn(ctx, status);
  expect(status.mock.calls).toEqual([["off"]]);
  expect(ctx.setDeviceError).toHaveBeenCalledWith("Ownership lost");
});

test("the entire form is validated before the first write", async () => {
  const ctx = context();
  await setWideAllParamsFn(ctx, 1, 120, 18, 1, 0, 50, 50, 50, 50, 50);
  expect(ctx.socketIPDwarf.request).not.toHaveBeenCalled();
  expect(ctx.setDeviceError).toHaveBeenCalled();
});
