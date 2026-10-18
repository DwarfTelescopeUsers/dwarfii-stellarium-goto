import {
  encodeCurrentParamId,
  getCurrentProfile,
  type CurrentCameraCatalog,
  type CurrentPacket,
  type CurrentWebSocketHandler,
  currentCaptureControlsForObservedMode,
  resolveCurrentCaptureControls,
} from "dwarfii_api";
import { executeCurrentCaptureWithRuntime } from "@/services/dwarf/captureRuntime";

const id = (category: number, paramIndex: number) =>
  encodeCurrentParamId({
    shootingMode: 2,
    category,
    cameraId: 0,
    paramIndex,
  });
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
          currentValue: 150,
          options: [{ value: 150, label: "10", seconds: 10 }],
        },
        {
          key: "gain",
          label: "Gain",
          source: "special",
          paramId: id(1, 2),
          currentValue: 100,
          options: [{ value: 100, label: "100" }],
        },
        {
          key: "stackCount",
          label: "Frame count",
          source: "general",
          paramId: id(2, 16),
          currentValue: 5,
          options: [{ value: 5, label: "5" }],
        },
      ],
    },
  ],
};
const settings = {
  cameraId: 0 as const,
  exposureSeconds: 10,
  gain: 100,
  frameCount: 5,
  filterIndex: 2,
};
const state = { session: { generation: 1, phase: "ready" as const } };
const packet = (cmd: number, data: Record<string, unknown>) =>
  ({ cmd, type: 2, known: true, data }) as CurrentPacket;

test("Mini rejects a Sun-mode confirmation when a DSO capture was requested", async () => {
  const client = {
    session: { state: { generation: 1 } },
    subscribe: jest.fn(),
  } as any;
  const transport = {
    request: jest.fn(async (operation: string) =>
      packet(
        0,
        operation === "getDeviceState"
          ? { teleCameraStateInfo: { exclusiveState: {} } }
          : { shootingModeId: 8 },
      ),
    ),
  } as any;
  await expect(
    executeCurrentCaptureWithRuntime(
      client,
      transport,
      getCurrentProfile(4),
      catalog,
      settings,
      async () => catalog,
    ),
  ).rejects.toThrow("shooting mode");
  expect(
    transport.request.mock.calls.map(([operation]: [string]) => operation),
  ).toEqual(["getDeviceState", "switchShootingMode"]);
});

test("Mini ignores stale frame progress and stops after five new frames", async () => {
  let listener: ((state: any, packet?: CurrentPacket) => void) | undefined;
  const client = {
    session: { state: { generation: 1 } },
    subscribe: jest.fn((callback) => {
      listener = callback;
      callback(state);
      return () => {
        listener = undefined;
      };
    }),
  } as unknown as CurrentWebSocketHandler;
  const sent: string[] = [];
  const transport = {
    request: jest.fn(async (operation: string) => {
      sent.push(operation);
      if (operation === "startTeleCapture") {
        listener?.(state, packet(15208, { state: 1 }));
        listener?.(state, packet(15209, { currentCount: 5, totalCount: 30 }));
      }
      if (operation === "stopTeleCapture")
        listener?.(state, packet(15208, { state: 3 }));
      return packet(0, {
        ...(operation === "getDeviceState"
          ? { teleCameraStateInfo: { exclusiveState: {} } }
          : {}),
        ...(operation === "switchShootingMode" ? { shootingModeId: 2 } : {}),
        ...(operation === "enterCamera" ? { shootingModeId: 2 } : {}),
        ...(operation === "switchShootingTech" ? { shootingTechId: 2 } : {}),
      });
    }),
  } as any;
  const capture = executeCurrentCaptureWithRuntime(
    client,
    transport,
    getCurrentProfile(4),
    catalog,
    settings,
    async () => catalog,
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(sent).toContain("startTeleCapture");
  expect(transport.request).toHaveBeenCalledWith("switchShootingMode", {
    mode: 2,
  });
  expect(sent).not.toContain("setQuickSet");
  expect(sent).not.toContain("stopTeleCapture");
  listener?.(state, packet(15209, { updateType: 2, totalCount: 30 }));
  for (let count = 1; count <= 5; count++)
    listener?.(state, packet(15209, { currentCount: count, totalCount: 30 }));
  await expect(capture).resolves.toEqual({ status: "completed", frames: 5 });
  expect(sent.filter((name) => name === "stopTeleCapture")).toHaveLength(1);
});

test("Mini stop acknowledgement keeps the transaction locked until stopped notification", async () => {
  let listener: ((state: any, packet?: CurrentPacket) => void) | undefined;
  const client = {
    session: { state: { generation: 1 } },
    subscribe: (callback) => {
      listener = callback;
      return () => {
        listener = undefined;
      };
    },
  } as unknown as CurrentWebSocketHandler;
  const transport = {
    request: jest.fn(async (operation: string) => {
      if (operation === "startTeleCapture") {
        listener?.(state, packet(15208, { state: 1 }));
        listener?.(state, packet(15209, { updateType: 2 }));
        listener?.(state, packet(15209, { currentCount: 5 }));
      }
      return packet(0, {
        ...(operation === "getDeviceState"
          ? { teleCameraStateInfo: { exclusiveState: {} } }
          : {}),
        ...(operation === "switchShootingMode" ? { shootingModeId: 2 } : {}),
        ...(operation === "enterCamera" ? { shootingModeId: 2 } : {}),
        ...(operation === "switchShootingTech" ? { shootingTechId: 2 } : {}),
      });
    }),
  } as any;
  let completed = false;
  const capture = executeCurrentCaptureWithRuntime(
    client,
    transport,
    getCurrentProfile(4),
    catalog,
    settings,
    async () => catalog,
  ).then(() => {
    completed = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(transport.request).toHaveBeenCalledWith("stopTeleCapture", {});
  expect(completed).toBe(false);
  listener?.(state, packet(15208, { state: 2 }));
  expect(completed).toBe(false);
  listener?.(state, packet(15208, { state: 3 }));
  await capture;
  expect(completed).toBe(true);
});

test("D3 reapplies requested settings in the device-reported runtime namespace and finishes from stopped state", async () => {
  let listener: ((state: any, packet?: CurrentPacket) => void) | undefined;
  const client = {
    session: { state: { generation: 1 } },
    subscribe: (callback) => {
      listener = callback;
      return () => {
        listener = undefined;
      };
    },
  } as unknown as CurrentWebSocketHandler;
  const profile = getCurrentProfile(2);
  const active = currentCaptureControlsForObservedMode(
    resolveCurrentCaptureControls(profile, catalog, settings),
    11,
  );
  const transport = {
    state,
    request: jest.fn(async (operation: string) => {
      if (operation === "startTeleCapture") {
        listener?.(state, {
          ...packet(15264, { paramId: active.exposure.paramId, value: 156 }),
          moduleId: 15,
        });
        listener?.(state, packet(15208, { state: 1 }));
        listener?.(state, packet(15209, { updateType: 2 }));
      }
      return packet(0, {
        ...(operation === "getDeviceState"
          ? { teleCameraStateInfo: { exclusiveState: {} } }
          : {}),
        ...(operation === "switchShootingMode" ? { shootingModeId: 2 } : {}),
        ...(operation === "enterCamera" ? { shootingModeId: 2 } : {}),
        ...(operation === "switchShootingTech" ? { shootingTechId: 2 } : {}),
        ...(operation === "getQuickSets"
          ? { cameraType: 0, quickSetList: [{ infoId: "0|0|15|100|0|0" }] }
          : {}),
      });
    }),
  } as any;
  let completed = false;
  const capture = executeCurrentCaptureWithRuntime(
    client,
    transport,
    profile,
    catalog,
    settings,
    async () => catalog,
  ).then(() => {
    completed = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(transport.request).toHaveBeenCalledWith(
    "setExposure",
    active.exposure,
  );
  expect(transport.request).toHaveBeenCalledWith("setGain", active.gain);
  expect(transport.request).toHaveBeenCalledWith(
    "setIntegerParameter",
    active.frameCount,
  );
  expect(completed).toBe(false);
  listener?.(state, packet(15209, { currentCount: 5, expIndex: 150 }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(transport.request).toHaveBeenCalledWith("stopTeleCapture", {});
  expect(completed).toBe(false);
  listener?.(state, packet(15208, { state: 3 }));
  await capture;
  expect(completed).toBe(true);
});

test("a busy hardware snapshot prevents settings writes even after a previous local timeout", async () => {
  const client = {
    session: { state: { generation: 1 } },
  } as unknown as CurrentWebSocketHandler;
  const transport = {
    request: jest.fn(async () =>
      packet(16405, {
        teleCameraStateInfo: {
          exclusiveState: { captureRawState: { state: 1 } },
        },
      }),
    ),
  } as any;
  await expect(
    executeCurrentCaptureWithRuntime(
      client,
      transport,
      getCurrentProfile(4),
      catalog,
      settings,
      async () => catalog,
    ),
  ).rejects.toThrow("idle state is not confirmed");
  expect(transport.request).toHaveBeenCalledTimes(1);
  expect(transport.request).toHaveBeenCalledWith("getDeviceState", {});
});
