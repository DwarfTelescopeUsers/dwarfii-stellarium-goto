import { encodeCurrentParamId, selectCurrentParameterValue } from "dwarfii_api";
import { normalizeDeviceCameraCatalog } from "@/services/dwarf/catalog";

const id = (cameraId: number) =>
  encodeCurrentParamId({
    shootingMode: 2,
    category: 2,
    cameraId,
    paramIndex: 16,
  });
function fixture() {
  return {
    code: 0,
    data: {
      modeId: 2,
      cameraParams: [0, 1].map((cameraId) => ({ cameraId })),
      shootingTechSettings: [0, 1].map((cameraId) => ({
        cameraId,
        generalParams: [
          {
            name: "stackCount",
            paramId: id(cameraId),
            minValue: 1,
            maxValue: 999,
            currentValue: 1,
          },
        ],
      })),
    },
  };
}
test("discovers per-camera frame counts with lossless firmware IDs and bounds", () => {
  const raw = JSON.stringify(fixture()).replace(
    /"paramId":"(\d+)"/g,
    '"paramId":$1',
  );
  const catalog = normalizeDeviceCameraCatalog(raw, 2);
  for (const camera of catalog.cameras) {
    const count = camera.parameters[0];
    expect(count.paramId).toBe(id(camera.cameraId));
    expect(selectCurrentParameterValue(count, 1).value).toBe(1);
    expect(selectCurrentParameterValue(count, 999).value).toBe(999);
    expect(() => selectCurrentParameterValue(count, 1000)).toThrow();
  }
});
test("rejects a technique control belonging to another camera", () => {
  const raw = fixture();
  raw.data.shootingTechSettings[0].generalParams[0].paramId = id(1);
  expect(() => normalizeDeviceCameraCatalog(raw, 2)).toThrow(
    "namespace mismatch",
  );
});
test("accepts the exact wide-angle count ID reported by D3 and Mini", () => {
  const raw = fixture();
  raw.data.shootingTechSettings[1].generalParams[0].paramId =
    "144695730215321616";
  expect(
    normalizeDeviceCameraCatalog(raw, 2).cameras[1].parameters[0].paramId,
  ).toBe("144695730215321616");
});
test("rejects invalid bounds and leaves original response unchanged", () => {
  const raw = fixture();
  const before = JSON.stringify(raw);
  normalizeDeviceCameraCatalog(raw, 2);
  expect(JSON.stringify(raw)).toBe(before);
  raw.data.shootingTechSettings[0].generalParams[0].maxValue = 0;
  expect(() => normalizeDeviceCameraCatalog(raw, 2)).toThrow("range");
});
test("does not import shared camera controls and accepts older catalogs", () => {
  const raw = fixture();
  raw.data.shootingTechSettings.push({ cameraId: 15, generalParams: [] });
  expect(normalizeDeviceCameraCatalog(raw, 2).cameras).toHaveLength(2);
  expect(
    normalizeDeviceCameraCatalog(
      { code: 0, data: { cameraParams: [{ cameraId: 0 }] } },
      2,
    ).cameras[0].parameters,
  ).toEqual([]);
});
