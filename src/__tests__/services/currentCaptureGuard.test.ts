jest.mock("@/services/dwarf/cameraParams", () => ({
  loadV3AstroParameterCatalog: jest.fn(),
  getV3NormalizedCameraCatalog: jest.fn(),
  resolveScienceFilterIndex: jest.fn(),
}));
jest.mock("@/lib/dwarf_utils", () => ({
  resolveCurrentCameraGainValue: jest.fn(),
}));

import { startCurrentAstroCapture } from "@/services/dwarf/capture";
import { loadV3AstroParameterCatalog } from "@/services/dwarf/cameraParams";

test("capture guard covers discovery, rejects another caller, and releases on failure", async () => {
  let release!: () => void;
  jest.mocked(loadV3AstroParameterCatalog).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const ctx = {
    typeIdDwarf: 4,
    IPDwarf: "192.0.2.1",
    socketIPDwarf: {
      isConnected: () => true,
      session: { state: { generation: 1 } },
      request: jest.fn(),
    },
  } as any;
  const first = startCurrentAstroCapture(ctx);
  await expect(startCurrentAstroCapture(ctx)).rejects.toThrow(
    "already in progress",
  );
  ctx.socketIPDwarf.session.state.generation++;
  release();
  await expect(first).rejects.toThrow("reconnected");
  expect(ctx.socketIPDwarf.request).not.toHaveBeenCalled();
  jest.mocked(loadV3AstroParameterCatalog).mockResolvedValue(undefined);
  await expect(startCurrentAstroCapture(ctx)).rejects.toThrow(
    "capabilities are not available",
  );
});
