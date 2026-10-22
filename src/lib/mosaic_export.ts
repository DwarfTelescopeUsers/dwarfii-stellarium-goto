export function readMosaicPlan(
  container: HTMLElement,
  settings: {
    target: string;
    telescope: string;
    view: string;
    overlapPercent: number;
    gridX: number;
    gridY: number;
  },
) {
  const table = container.querySelector("table");
  const columns = table
    ? Array.from(table.rows[0]?.cells ?? [])
        .slice(1)
        .map((cell) => cell.textContent?.trim() ?? "")
    : [];
  const panels = table
    ? Array.from(table.rows)
        .slice(1)
        .flatMap((row) =>
          Array.from(row.cells)
            .slice(1)
            .map((cell, index) => ({
              row: Number(row.cells[0]?.textContent?.trim()),
              column: columns[index],
              coordinates: cell.textContent?.trim() ?? "",
            })),
        )
    : [];
  const center = table ? null : container.textContent?.trim() || null;
  if (!center && !panels.length) return null;
  return { ...settings, center, panels };
}
