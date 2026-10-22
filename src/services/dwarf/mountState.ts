/** Canonical notify.proto state projection. No ACK or idle event proves a solve. */
export function mountOperationLabel(state: unknown): string {
  return typeof state === "number"
    ? (["Idle", "Running", "Stopping", "Stopped", "Plate solving"][state] ??
        "Unknown state")
    : "Unknown state";
}

export function oneClickGotoPhase(data: Record<string, any>):
  | {
      phase: string;
      state: number;
      targetName?: string;
    }
  | undefined {
  const phases = [
    ["astroAutoFocusState", "Autofocus"],
    ["astroCalibrationState", "Calibration"],
    ["astroGotoState", "GOTO"],
    ["astroTrackingState", "Tracking"],
  ] as const;
  const present = phases.filter(([key]) => data[key] != null);
  if (present.length !== 1) return;
  const [key, phase] = present[0];
  const value = data[key];
  const state = value.state ?? 0;
  const maximum = phase === "GOTO" || phase === "Calibration" ? 4 : 3;
  if (!Number.isInteger(state) || state < 0 || state > maximum) return;
  return { phase, state, targetName: value.targetName };
}

export function calibrationCoordinates(data: Record<string, any>):
  | {
      azimuth: number;
      altitude: number;
    }
  | undefined {
  // An empty result is not solve evidence (research session.py explicitly rejects it).
  if (!("azi" in data) && !("alt" in data)) return;
  // Fields are non-optional doubles; protobuf legitimately omits zero.
  const azimuth = data.azi ?? 0;
  const altitude = data.alt ?? 0;
  if (!Number.isFinite(azimuth) || !Number.isFinite(altitude)) return;
  return { azimuth, altitude };
}
