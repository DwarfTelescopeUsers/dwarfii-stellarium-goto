const active = new WeakMap<object, object>();
const revisions = new WeakMap<object, number>();

/** Delayed restoration must not overwrite a newer job on the same connection. */
export function captureOwnershipRevision(client?: object): number {
  return client ? (revisions.get(client) ?? 0) : 0;
}

export function assertCameraIdle(
  snapshot: Record<string, any>,
  cameraId: number,
) {
  const exclusive = (
    cameraId === 0 ? snapshot.teleCameraStateInfo : snapshot.wideCameraStateInfo
  )?.exclusiveState;
  if (
    !exclusive ||
    typeof exclusive !== "object" ||
    Object.values(exclusive).some(
      (value: any) =>
        !value || (value.code ?? 0) !== 0 || ![0, 3].includes(value.state ?? 0),
    )
  )
    throw new Error(
      "Camera idle state is not confirmed. Stop its current task and wait for idle before configuring another capture.",
    );
}

/** One physical connection owns one astronomy configuration transaction, even
 * when Fleet and the selected-device page both reference it. */
export function acquireCaptureOwnership(client: object): () => void {
  if (active.has(client))
    throw new Error(
      "An astronomy capture or mosaic already owns this device. Stop it and wait for idle before starting another.",
    );
  const token = {};
  active.set(client, token);
  revisions.set(client, captureOwnershipRevision(client) + 1);
  return () => {
    // Disposal is idempotent; an old release cannot unlock a newer job.
    if (active.get(client) === token) active.delete(client);
  };
}
