import {
  initialSessionPreview,
  reduceSessionPreview,
} from "@/services/dwarf/sessionPreview";

const packet = (cmd: number, data: any, type = 2) =>
  ({ known: true, cmd, type, data }) as any;

test("telephoto and wide capture counters remain isolated", () => {
  const tele = reduceSessionPreview(
    {},
    packet(15209, { currentCount: 3, stackedCount: 2 }),
    0,
  );
  expect(tele).toEqual({ frames: 3, stackedFrames: 2 });
  expect(
    reduceSessionPreview(
      tele,
      packet(15237, { currentCount: 99, cameraType: 1 }),
      0,
    ),
  ).toBe(tele);
  expect(
    reduceSessionPreview(
      tele,
      packet(15209, { currentCount: 99, cameraType: 1 }),
      0,
    ),
  ).toBe(tele);
  expect(
    reduceSessionPreview(
      {},
      packet(15237, { currentCount: 4, stackedCount: 3, cameraType: 1 }),
      1,
    ),
  ).toEqual({ frames: 4, stackedFrames: 3 });
});

test("zero counts and mosaic progress are authoritative", () => {
  expect(
    reduceSessionPreview(initialSessionPreview, packet(15263, {}), 0),
  ).toEqual({ frames: 0, stackedFrames: 0 });
  expect(
    reduceSessionPreview({}, packet(15263, { currentCount: 2 }), 1),
  ).toEqual({});
});

test("real D3 separate capture/stack updates preserve each other and reset at a new sequence", () => {
  let state = reduceSessionPreview({}, packet(15209, { currentCount: 3 }), 0);
  state = reduceSessionPreview(
    state,
    packet(15209, { updateType: 1, stackedCount: 1 }),
    0,
  );
  expect(state).toEqual({ frames: 3, stackedFrames: 1 });
  state = reduceSessionPreview(state, packet(15209, { currentCount: 4 }), 0);
  expect(state).toEqual({ frames: 4, stackedFrames: 1 });
  expect(
    reduceSessionPreview(state, packet(15209, { updateType: 2 }), 0),
  ).toEqual({ frames: 0, stackedFrames: 0 });
});

test("acknowledgements, failed or malformed updates do not replace counters", () => {
  const state = { frames: 4, stackedFrames: 3 };
  for (const update of [
    packet(15209, {}, 1),
    packet(15209, { code: 1 }),
    packet(15209, { currentCount: -1 }),
    packet(15209, { stackedCount: 1.2 }),
    { ...packet(15209, {}), known: false },
  ])
    expect(reduceSessionPreview(state, update, 0)).toBe(state);
});
