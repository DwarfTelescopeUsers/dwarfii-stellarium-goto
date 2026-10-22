export const PLANNER_SELECTION_KEY = "dwarfium-planner-selection-v1";

export type PlannerSkySelection = {
  name: string;
  rightAscension: string;
  declination: string;
  fovWidthDegrees: number;
  fovHeightDegrees: number;
};

export function isPlannerSkySelection(
  value: unknown,
): value is PlannerSkySelection {
  if (!value || typeof value !== "object") return false;
  const selection = value as Partial<PlannerSkySelection>;
  return (
    typeof selection.name === "string" &&
    typeof selection.rightAscension === "string" &&
    typeof selection.declination === "string" &&
    typeof selection.fovWidthDegrees === "number" &&
    Number.isFinite(selection.fovWidthDegrees) &&
    typeof selection.fovHeightDegrees === "number" &&
    Number.isFinite(selection.fovHeightDegrees)
  );
}

type PlannerQuery = Record<string, string | string[] | undefined>;

export function plannerSkySelectionHref(selection: PlannerSkySelection) {
  const query = new URLSearchParams({
    from: "sky-atlas",
    target: selection.name,
    ra: selection.rightAscension,
    dec: selection.declination,
    fovWidth: String(selection.fovWidthDegrees),
    fovHeight: String(selection.fovHeightDegrees),
  });
  return `/scheduler/?${query.toString()}`;
}

export function plannerSkySelectionFromQuery(
  query: PlannerQuery,
): PlannerSkySelection | null {
  const single = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : "";
  if (single(query.from) !== "sky-atlas") return null;

  const name = single(query.target).trim();
  const rightAscension = single(query.ra).trim();
  const declination = single(query.dec).trim();
  const fovWidthDegrees = Number(single(query.fovWidth));
  const fovHeightDegrees = Number(single(query.fovHeight));
  if (
    !name ||
    !rightAscension ||
    !declination ||
    !Number.isFinite(fovWidthDegrees) ||
    !Number.isFinite(fovHeightDegrees) ||
    fovWidthDegrees <= 0 ||
    fovHeightDegrees <= 0
  )
    return null;

  return {
    name,
    rightAscension,
    declination,
    fovWidthDegrees,
    fovHeightDegrees,
  };
}
