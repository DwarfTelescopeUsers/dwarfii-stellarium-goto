import { readMosaicPlan } from "@/lib/mosaic_export";

const settings = {
  target: "M31",
  telescope: "DWARF mini",
  view: "mosaic",
  overlapPercent: 20,
  gridX: 2,
  gridY: 1,
};

test("exports each Mini mosaic panel without splitting coordinate text", () => {
  const container = document.createElement("div");
  container.innerHTML =
    "<table><tr><td></td><td>A</td><td>B</td></tr>" +
    "<tr><td>1</td><td>00h 42m 44s +41° 16′</td><td>00h 43m 10s +41° 16′</td></tr></table>";
  expect(readMosaicPlan(container, settings)).toEqual({
    ...settings,
    center: null,
    panels: [
      { row: 1, column: "A", coordinates: "00h 42m 44s +41° 16′" },
      { row: 1, column: "B", coordinates: "00h 43m 10s +41° 16′" },
    ],
  });
});

test("exports a single FoV frame too", () => {
  const container = document.createElement("div");
  container.textContent = "RA/DEC 0.712 41.268";
  expect(readMosaicPlan(container, { ...settings, view: "fov" })).toMatchObject(
    {
      center: "RA/DEC 0.712 41.268",
      panels: [],
    },
  );
});
