import {
  CurrentProtocolError,
  type CurrentCommand,
  type CurrentPacket,
  type CurrentWebSocketHandler,
} from "dwarfii_api";

export function captureWarning(code: unknown): string | undefined {
  if (code === -11503)
    return "No matching dark frame was found. Continue without a matching dark frame?";
  if (code === -11530)
    return "The dark-frame temperature does not match the sensor. Continue with reduced calibration quality?";
}

type Pending = {
  camera: number;
  stop: boolean;
  finish: (packet?: CurrentPacket, error?: unknown) => void;
};
type CaptureState = {
  revision: number;
  acceptWarnings: boolean;
  generation: number;
  warningCamera?: number;
  pending?: Pending;
  active: Set<number>;
};
const states = new WeakMap<CurrentWebSocketHandler, CaptureState>();

function stateFor(client: CurrentWebSocketHandler): CaptureState {
  const existing = states.get(client);
  if (existing) return existing;
  const value: CaptureState = {
    revision: 0,
    acceptWarnings: false,
    generation: client.session.state.generation,
    active: new Set(),
  };
  states.set(client, value);
  client.subscribe((state, packet) => {
    if (
      state.session.generation !== value.generation ||
      state.session.phase !== "ready" ||
      state.session.ownership !== "control"
    ) {
      value.pending?.finish(
        undefined,
        new Error(
          "Capture connection or control changed. Reconnect before retrying.",
        ),
      );
      value.warningCamera = undefined;
      value.revision++;
      value.acceptWarnings = false;
      value.active.clear();
      value.generation = state.session.generation;
      return;
    }
    if (!packet?.known) return;
    if (
      packet.type === 1 &&
      value.acceptWarnings &&
      [11005, 11016, 11050].includes(packet.cmd) &&
      captureWarning(packet.data.code)
    ) {
      value.warningCamera =
        packet.cmd === 11016
          ? 1
          : packet.cmd === 11005
            ? 0
            : value.pending?.camera;
      value.pending?.finish(
        undefined,
        new CurrentProtocolError(
          "device",
          captureWarning(packet.data.code)!,
          packet.data.code,
          packet.cmd,
        ),
      );
    }
    if (
      packet.type !== 2 ||
      ![15208, 15236].includes(packet.cmd) ||
      (packet.data.code ?? 0) !== 0
    )
      return;
    const camera = packet.cmd === 15208 ? 0 : 1;
    const status = packet.data.state ?? 0;
    if (status === 1) value.active.add(camera);
    if (status === 0 || status === 3) {
      value.active.delete(camera);
      if (value.warningCamera === camera) value.warningCamera = undefined;
    }
    const pending = value.pending;
    if (
      pending?.camera === camera &&
      (pending.stop ? status === 0 || status === 3 : status === 1)
    ) {
      // Return the actual notification, never a fabricated command ACK.
      pending.finish(packet);
    }
  });
  return value;
}

/** Capture commands may complete via lifecycle notifications without an ACK.
 * SDK request rejection is still observed (including after notification success).
 * No progress counters or image completion are inferred here.
 */
export function requestCaptureCommand(
  client: CurrentWebSocketHandler,
  operation: CurrentCommand,
  values: Record<string, unknown> = {},
): Promise<CurrentPacket> {
  if (
    ![
      "startTeleCapture",
      "startWideCapture",
      "stopTeleCapture",
      "stopWideCapture",
      "continueCapture",
    ].includes(operation)
  )
    return client.request(operation, values);
  if (!client.ready || client.session.state.ownership !== "control")
    return Promise.reject(
      new Error("Connect and request control before capture."),
    );
  const state = stateFor(client);
  const stop = operation.startsWith("stop");
  const continuation = operation === "continueCapture";
  const camera = continuation
    ? state.warningCamera
    : operation.includes("Wide")
      ? 1
      : 0;
  if (camera === undefined)
    return Promise.reject(
      new Error("There is no current capture warning to continue."),
    );
  if (state.pending && !stop)
    return Promise.reject(new Error("A capture command is already pending."));
  if (
    !stop &&
    !continuation &&
    (state.active.has(camera) || state.warningCamera !== undefined)
  )
    return Promise.reject(
      new Error(
        "Stop the existing capture or resolve its warning before starting another.",
      ),
    );
  if (stop) {
    state.pending?.finish(
      undefined,
      new Error("Capture start cancelled by Stop."),
    );
    state.warningCamera = undefined;
  }
  const revision = ++state.revision;
  state.acceptWarnings = !stop;
  return new Promise((resolve, reject) => {
    let finished = false;
    const pending: Pending = {
      camera,
      stop,
      finish: (packet, error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (state.pending === pending) state.pending = undefined;
        if (!error && continuation && state.revision === revision)
          state.warningCamera = undefined;
        if (error) reject(error);
        else resolve(packet!);
      },
    };
    const timer = setTimeout(
      () =>
        pending.finish(
          undefined,
          new Error(
            "No capture acknowledgement or matching device state received. Check device status before retrying.",
          ),
        ),
      60000,
    );
    state.pending = pending;
    // A longer start timeout allows firmware preparation; the first matching
    // notification can resolve this promise immediately, without waiting for it.
    void client.request(operation, values, 60000).then(
      (packet) => {
        if (continuation && state.revision === revision)
          state.warningCamera = undefined;
        pending.finish(packet);
      },
      (error) => {
        if (
          captureWarning(error?.code) &&
          state.revision === revision &&
          state.generation === client.session.state.generation
        )
          state.warningCamera = camera;
        pending.finish(undefined, error);
      },
    );
  });
}
