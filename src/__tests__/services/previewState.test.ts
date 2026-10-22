import {
  previewTransport,
  reducePreviewTypes,
} from "@/services/dwarf/previewState";

test.each([2, 4])(
  "hardware %i uses reported JPEG/RTSP per camera and preserves unknown",
  (hardware) => {
    expect(previewTransport(hardware, 1)).toBe("rtsp");
    expect(previewTransport(hardware, 2)).toBe("jpeg");
    expect(previewTransport(hardware, 0)).toBe("unknown");
    expect(previewTransport(hardware, undefined)).toBe("unknown");
  },
);
test("snapshots and notifications preserve per-camera zero and missing-message semantics", () => {
  const packet = (cmd: number, data: any, type = 2) =>
    ({ known: true, cmd, type, data }) as any;
  let value = reducePreviewTypes(
    {},
    packet(
      16405,
      {
        teleCameraStateInfo: { streamType: { streamType: 2 } },
        wideCameraStateInfo: { streamType: { streamType: 1, camId: 1 } },
      },
      1,
    ),
  );
  expect(value).toEqual({ tele: 2, wide: 1 });
  value = reducePreviewTypes(value, packet(15234, { camId: 1 }));
  expect(value).toEqual({ tele: 2, wide: 0 });
  value = reducePreviewTypes(
    value,
    packet(16405, { teleCameraStateInfo: { streamType: {} } }, 1),
  );
  expect(value).toEqual({ tele: 0, wide: undefined });
});
