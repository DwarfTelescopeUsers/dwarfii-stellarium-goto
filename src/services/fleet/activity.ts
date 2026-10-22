import type { CurrentPacket } from "dwarfii_api";

export type ActivityEvidence = Readonly<{
  tele?: number;
  wide?: number;
  focus?: number;
  goto?: number;
  tracking?: number;
}>;

function stateOf(value: any): number | undefined {
  if (!value || typeof value !== "object") return undefined;
  const state = value.state ?? 0;
  return Number.isInteger(state) && state >= 0 && state <= 4
    ? state
    : undefined;
}

function exclusiveState(subsystem: any, keys: string[]): number | undefined {
  const exclusive = subsystem?.exclusiveState;
  if (!exclusive || typeof exclusive !== "object") return undefined;
  if (Object.keys(exclusive).length === 0) return 0;
  for (const key of keys)
    if (exclusive[key] !== undefined) return stateOf(exclusive[key]);
  return undefined;
}

/** Snapshot absence is unknown. Separate channels prevent wide-idle clearing tele capture. */
export function reduceActivity(
  previous: ActivityEvidence,
  packet: CurrentPacket,
): ActivityEvidence {
  if (!packet.known || packet.type === 0 || (packet.data.code ?? 0) !== 0)
    return previous;
  if (packet.cmd === 16405) {
    const value = packet.data;
    const motion = value.motionMotorStateInfo;
    const nested = motion?.exclusiveState?.oneClickGotoState;
    const mount = nested ? { exclusiveState: nested } : motion;
    return Object.freeze({
      tele: exclusiveState(value.teleCameraStateInfo, ["captureRawState"]),
      wide: exclusiveState(value.wideCameraStateInfo, ["captureRawState"]),
      focus: exclusiveState(value.focusMotorStateInfo, [
        "astroAutoFocusState",
        "normalAutoFocusState",
        "astroAutoFocusFastState",
        "areaAutoFocusState",
      ]),
      goto: exclusiveState(mount, ["astroGotoState", "calibrationState"]),
      tracking: exclusiveState(mount, ["astroTrackingState"]),
    });
  }
  if (packet.type !== 2) return previous;
  if (packet.cmd === 15233) {
    return Object.freeze({
      ...previous,
      goto: stateOf(packet.data.astroGotoState),
      tracking: stateOf(packet.data.astroTrackingState),
    });
  }
  const field = (
    {
      15208: "tele",
      15236: "wide",
      15278: "focus",
      15280: "focus",
      15211: "goto",
    } as const
  )[packet.cmd];
  const state = stateOf(packet.data);
  return field && state !== undefined
    ? Object.freeze({ ...previous, [field]: state })
    : previous;
}

export function summarizeActivity(evidence: ActivityEvidence) {
  const active = (value?: number) => value === 1 || value === 2 || value === 4;
  if (active(evidence.tele) || active(evidence.wide))
    return "capturing" as const;
  if (active(evidence.focus)) return "focusing" as const;
  if (active(evidence.goto)) return "slewing" as const;
  if (active(evidence.tracking)) return "tracking" as const;
  // Partial idle evidence is not proof that all other subsystems are idle.
  if (
    [evidence.tele, evidence.wide, evidence.focus, evidence.goto].every(
      (value) => value === 0 || value === 3,
    )
  )
    return "idle" as const;
  return "unknown" as const;
}
