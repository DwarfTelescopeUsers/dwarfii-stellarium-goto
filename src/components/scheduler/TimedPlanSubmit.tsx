import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { queueTimedObservation } from "@/services/dwarf/scheduleDevice";
import type { TimedObservationRecipe } from "@/services/dwarf/timedSchedule";

type Plan = Omit<TimedObservationRecipe, "endAt"> & {
  id: string;
  frameCount: number;
};

export default function TimedPlanSubmit({ plan }: { plan: Plan }) {
  const context = useContext(ConnectionContext);
  const [endAt, setEndAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const token = useMemo(
    () => ({}),
    [
      context.IPDwarf,
      context.socketIPDwarf,
      context.socketIPDwarf?.currentClient,
      context.socketIPDwarf?.session?.state.generation,
      plan.id,
    ],
  );
  const current = useRef<object | undefined>(token);
  current.current = token;
  useEffect(
    () => () => {
      current.current = undefined;
    },
    [],
  );
  useEffect(() => {
    setBusy(false);
    setNotice("");
  }, [token]);
  async function queue() {
    if (busy) return;
    const target = token;
    setBusy(true);
    setNotice("");
    try {
      const result = await queueTimedObservation(context, { ...plan, endAt });
      if (current.current === target)
        setNotice(
          `Timed job confirmed on ${context.IPDwarf} (${result.scheduleId}). Read device schedules to manage or cancel it.`,
        );
    } catch (error) {
      if (current.current === target)
        setNotice(
          error instanceof Error
            ? error.message
            : "The device did not confirm the timed job.",
        );
    } finally {
      if (current.current === target) setBusy(false);
    }
  }
  return (
    <details className="dw-timed-plan-submit">
      <summary>Queue a timed device session</summary>
      <p>
        Submit to{" "}
        <strong>
          {context.typeNameDwarf || "DWARF"}{" "}
          {context.IPDwarf || "not connected"}
        </strong>
        , starting {plan.startAt || "at the plan's start time"}. The telescope
        captures during the chosen time window. This does not guarantee the
        plan's {plan.frameCount} frames and continues after this page closes.
        Choose a window of at least 10 minutes.
      </p>
      <label>
        Explicit local end time
        <input
          type="datetime-local"
          value={endAt}
          onChange={(event) => setEndAt(event.target.value)}
          disabled={busy}
        />
      </label>
      {(plan.eqMode || plan.captureDarks) && (
        <p>
          Automatic EQ setup and dark capture are not implemented by this
          timed-job adapter. Edit the plan to disable those preparation flags;
          prepare the telescope in Control before the scheduled start.
        </p>
      )}
      <p>
        The live catalogue must advertise the exact exposure, gain and filter.
        The native scheduler must answer on this firmware. Alignment uses the
        configured observing location; autofocus follows this plan's setting.
      </p>
      <button
        type="button"
        className="dw-button dw-button-secondary"
        disabled={
          busy ||
          !endAt ||
          !context.connectionStatus ||
          context.connectionStatusSlave !== false ||
          plan.eqMode ||
          plan.captureDarks
        }
        onClick={() => void queue()}
      >
        {busy
          ? "Checking and submitting…"
          : `Queue timed job on ${context.IPDwarf || "DWARF"}`}
      </button>
      {notice && <p role="status">{notice}</p>}
    </details>
  );
}
