jest.mock("@/services/dwarf/cameraParams", () => ({
  loadV3AstroParameterCatalog: jest.fn(),
  getV3NormalizedCameraCatalog: jest.fn(),
}));
import {
  encodeCurrentParamId,
  type CurrentCameraCatalog,
  type CurrentPacket,
} from "dwarfii_api";
import { startCurrentMosaic } from "@/services/dwarf/mosaic";
import { getV3NormalizedCameraCatalog } from "@/services/dwarf/cameraParams";
import { acquireCaptureOwnership } from "@/services/dwarf/captureOwnership";

const id = (category: number, paramIndex: number) =>
  encodeCurrentParamId({ shootingMode: 2, category, cameraId: 0, paramIndex });
const catalog: CurrentCameraCatalog = {
  modeId: 2,
  cameras: [
    {
      cameraId: 0,
      parameters: [
        {
          key: "exp",
          label: "Exposure",
          source: "special",
          paramId: id(1, 1),
          currentValue: 156,
          options: [{ value: 156, label: "15", seconds: 15 }],
        },
        {
          key: "gain",
          label: "Gain",
          source: "special",
          paramId: id(1, 2),
          currentValue: 80,
          options: [{ value: 80, label: "80" }],
        },
        {
          key: "mosaicCount",
          label: "Mosaic count",
          source: "general",
          paramId: id(2, 17),
          currentValue: 10,
          range: { minimum: 1, maximum: 249, integer: true },
        },
      ],
    },
  ],
};
const settings = {
  horizontalScale: 150,
  verticalScale: 140,
  exposureSeconds: 15,
  gain: 80,
  count: 10,
  filterIndex: 1,
};
const packet = (cmd: number, data: Record<string, unknown>, type = 1) =>
  ({ cmd, data, known: true, type }) as CurrentPacket;
function setup() {
  let listener: ((state: any, packet?: CurrentPacket) => void) | undefined;
  const client = {
    session: { state: { generation: 1, ownership: "control" } },
    subscribe: jest.fn((callback) => {
      listener = callback;
      return () => {
        listener = undefined;
      };
    }),
  };
  const request = jest.fn(async (operation: string) =>
    packet(0, {
      ...(operation === "getDeviceState"
        ? { teleCameraStateInfo: { exclusiveState: {} } }
        : {}),
      ...(operation === "switchShootingMode" || operation === "enterCamera"
        ? { shootingModeId: 2 }
        : {}),
      ...(operation === "switchShootingTech" ? { shootingTechId: 2 } : {}),
    }),
  );
  const socket = { currentClient: client, isConnected: () => true, request };
  const context = {
    socketIPDwarf: socket,
    IPDwarf: "192.0.2.1",
    typeIdDwarf: 4,
  } as any;
  jest.mocked(getV3NormalizedCameraCatalog).mockReturnValue(catalog);
  return {
    client,
    request,
    context,
    notify: (cmd: number, data: Record<string, unknown>) =>
      listener?.({}, packet(cmd, data, 2)),
  };
}

test("uses native mosaic count 17 and scale units, and stops only from device state", async () => {
  const { context, request, notify } = setup();
  const report = jest.fn();
  const run = await startCurrentMosaic(context, settings, report);
  expect(request).toHaveBeenCalledWith("switchShootingMode", { mode: 2 });
  expect(request).toHaveBeenCalledWith("setIntegerParameter", {
    paramId: id(2, 17),
    value: 10,
  });
  expect(request).toHaveBeenCalledWith("startTeleMosaic", {
    horizontalScale: 150,
    verticalScale: 140,
    rotation: -1,
    irIndex: 1,
    forceStart: false,
  });
  expect(report).toHaveBeenLastCalledWith({ phase: "submitted" });
  let complete = false;
  void run.completed.then(() => {
    complete = true;
  });
  notify(15263, { currentCount: 3, stackedCount: 2, fovId: 1, fovTotal: 4 });
  expect(report).toHaveBeenLastCalledWith({
    phase: "running",
    currentCount: 3,
    stackedCount: 2,
    fovId: 1,
    fovTotal: 4,
  });
  run.stop();
  await Promise.resolve();
  expect(request).toHaveBeenCalledWith("stopTeleCapture", {});
  expect(complete).toBe(false);
  notify(15208, { state: 3 });
  await run.completed;
  expect(complete).toBe(true);
});

test("rejects missing mosaic capability and observer mode without starting a job", async () => {
  const { context, client, request } = setup();
  client.session.state.ownership = "slave";
  await expect(
    startCurrentMosaic(context, settings, jest.fn()),
  ).rejects.toThrow("control changed");
  expect(request).not.toHaveBeenCalled();
  client.session.state.ownership = "control";
  jest.mocked(getV3NormalizedCameraCatalog).mockReturnValue({
    ...catalog,
    cameras: [
      {
        cameraId: 0,
        parameters: catalog.cameras[0].parameters.filter(
          (entry) => entry.key !== "mosaicCount",
        ),
      },
    ],
  });
  await expect(
    startCurrentMosaic(context, settings, jest.fn()),
  ).rejects.toThrow();
  expect(request).not.toHaveBeenCalledWith(
    "startTeleMosaic",
    expect.anything(),
  );
});

test("an active mosaic excludes a parallel Fleet or selected-device capture", async () => {
  const { context, client, notify } = setup();
  const run = await startCurrentMosaic(context, settings, jest.fn());
  expect(() => acquireCaptureOwnership(client)).toThrow("already owns");
  notify(15208, { state: 1 });
  notify(15208, { state: 3 });
  await run.completed;
  const release = acquireCaptureOwnership(client);
  release();
});

test("reconnect during preparation prevents any start on the next session", async () => {
  const { context, request, client } = setup();
  request.mockImplementationOnce(async () => {
    client.session.state.generation++;
    return packet(16405, { teleCameraStateInfo: { exclusiveState: {} } });
  });
  await expect(
    startCurrentMosaic(context, settings, jest.fn()),
  ).rejects.toThrow("connection or control changed");
  expect(request).toHaveBeenCalledTimes(1);
});
