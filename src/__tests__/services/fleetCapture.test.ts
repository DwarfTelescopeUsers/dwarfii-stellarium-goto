jest.mock("@/services/dwarf/captureRuntime", () => ({
  executeCurrentCaptureWithRuntime: jest.fn(),
}));
import { getCurrentProfile } from "dwarfii_api";
import { executeCurrentCaptureWithRuntime } from "@/services/dwarf/captureRuntime";
import { FleetDeviceController } from "@/services/fleet/controller";

const settings = {
  cameraId: 0 as const,
  exposureSeconds: 1,
  gain: 10,
  frameCount: 2,
  filterIndex: 1,
};
function harness(id: string) {
  const controller = new FleetDeviceController(id);
  const client = {
    subscribe: jest.fn(),
    ready: true,
    session: { state: { generation: 1, ownership: "control" } },
    request: jest.fn().mockResolvedValue({}),
    close: jest.fn(),
  };
  Object.assign(controller, { client, profile: getCurrentProfile(4) });
  jest
    .spyOn(controller, "loadCatalog")
    .mockResolvedValue({ modeId: 2, cameras: [] } as any);
  return { controller, client };
}
afterEach(() => jest.restoreAllMocks());
test("capture uses the originating device and freshly discovered catalog", async () => {
  const a = harness("a"),
    b = harness("b");
  jest
    .mocked(executeCurrentCaptureWithRuntime)
    .mockImplementationOnce(
      async (_client, transport, profile, catalog, received) => {
        expect(profile.hardwareId).toBe(4);
        expect(catalog.modeId).toBe(2);
        expect(received).toEqual(settings);
        await transport.request("startTeleCapture", {});
        return {} as any;
      },
    );
  await a.controller.capture(settings);
  expect(a.controller.loadCatalog).toHaveBeenCalledWith(2);
  expect(a.client.request).toHaveBeenCalledWith("startTeleCapture", {}, 60000);
  expect(b.client.request).not.toHaveBeenCalled();
});
test("stop cancels unsent transaction steps and duplicate capture is rejected", async () => {
  const a = harness("a");
  let resume!: () => void;
  const gate = new Promise<void>((resolve) => {
    resume = resolve;
  });
  jest
    .mocked(executeCurrentCaptureWithRuntime)
    .mockImplementationOnce(async (_client, transport) => {
      await gate;
      await transport.request("startTeleCapture", {});
      return {} as any;
    });
  const capture = a.controller.capture(settings);
  await expect(a.controller.capture(settings)).rejects.toThrow(
    "already in progress",
  );
  await a.controller.request("stopTeleCapture");
  resume();
  await expect(capture).rejects.toThrow("previous connection");
  expect(a.client.request).toHaveBeenCalledTimes(1);
  expect(a.client.request).toHaveBeenCalledWith("stopTeleCapture", {}, 60000);
});

test("an old capture cannot unlock or complete a capture on the replacement connection", async () => {
  const a = harness("a");
  let finishOld!: (result: any) => void;
  let finishNew!: (result: any) => void;
  jest
    .mocked(executeCurrentCaptureWithRuntime)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishNew = resolve;
        }),
    );
  const oldCapture = a.controller.capture(settings);
  await Promise.resolve();
  a.controller.disconnect();
  const replacement = harness("replacement");
  Object.assign(a.controller, {
    client: replacement.client,
    profile: getCurrentProfile(4),
  });
  const newCapture = a.controller.capture(settings);
  await Promise.resolve();
  finishOld({ status: "completed", frames: 2 });
  await expect(oldCapture).rejects.toThrow("previous connection");
  await expect(a.controller.capture(settings)).rejects.toThrow(
    "already in progress",
  );
  finishNew({ status: "completed", frames: 2 });
  await expect(newCapture).resolves.toMatchObject({ status: "completed" });
});
