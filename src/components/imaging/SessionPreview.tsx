/* eslint-disable @next/next/no-img-element */
import { useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { getProxyUrl, getTransfomProxyImageUrl } from "@/lib/get_proxy_url";
import { telephotoURL, wideangleURL } from "@/services/dwarf";
import {
  initialSessionPreview,
  reduceSessionPreview,
} from "@/services/dwarf/sessionPreview";
import type { ConnectionContextType } from "@/types";

const socketIds = new WeakMap<object, number>();
let nextSocketId = 0;
function socketId(socket?: object) {
  if (!socket) return 0;
  if (!socketIds.has(socket)) socketIds.set(socket, ++nextSocketId);
  return socketIds.get(socket);
}

/** Read-only session JPEG stream, independent of the framing camera controls. */
export default function SessionPreview() {
  const context = useContext(ConnectionContext);
  const generation = context.socketIPDwarf?.session?.state.generation;
  const identity = [
    context.typeUidDwarf,
    context.IPDwarf,
    socketId(context.socketIPDwarf),
    generation,
    context.imagingSession.startTime,
  ].join(":");
  const cameras: readonly { cameraId: 0 | 1; revision: number }[] =
    context.sessionPreviewCameras ?? [
      {
        cameraId: context.imagingSession.astroCamera === 1 ? 1 : 0,
        revision: 0,
      },
    ];
  return (
    <>
      {cameras.map(({ cameraId, revision }) => (
        <SessionImage
          key={`${identity}:${cameraId}:${revision}`}
          context={context}
          camera={cameraId}
        />
      ))}
    </>
  );
}

function SessionImage({
  context,
  camera,
}: {
  context: ConnectionContextType;
  camera: 0 | 1;
}) {
  const socket = context.socketIPDwarf;
  const generation = socket?.session?.state.generation;
  const signal = context.deviceOperationSignal;
  const [progress, setProgress] = useState(initialSessionPreview);
  const [available, setAvailable] = useState(
    !!socket?.isConnected() && !signal?.aborted,
  );
  const [status, setStatus] = useState<"waiting" | "live" | "error">("waiting");
  const [attempt, setAttempt] = useState(0);
  const image = useRef<HTMLImageElement>(null);
  const host = context.IPDwarf;
  const source = host
    ? getTransfomProxyImageUrl(
        camera === 0 ? telephotoURL(host) : wideangleURL(host),
        getProxyUrl(context),
        context,
        false,
      )
    : "";

  useEffect(() => {
    let active = true;
    const stop = () => {
      if (active) setAvailable(false);
    };
    setAvailable(!!socket?.isConnected() && !signal?.aborted);
    signal?.addEventListener("abort", stop);
    const detach = socket?.currentClient?.subscribe((state, packet) => {
      if (!active || signal?.aborted) return;
      if (
        state.session.phase !== "ready" ||
        state.session.generation !== generation
      ) {
        stop();
        return;
      }
      if (packet)
        setProgress((previous) =>
          reduceSessionPreview(previous, packet, camera),
        );
    });
    return () => {
      active = false;
      signal?.removeEventListener("abort", stop);
      detach?.();
    };
  }, [socket, generation, signal, camera]);

  return (
    <section className="dw-panel mb-3" aria-label="Session image">
      <h2>Session image</h2>
      <p>
        {camera === 0 ? "Telephoto" : "Wide-angle"}
        {progress.targetName ? ` · ${progress.targetName}` : ""}:{" "}
        {progress.frames ?? "—"} frames captured,{" "}
        {progress.stackedFrames ?? "—"} stacked.
      </p>
      {!available || !source ? (
        <p role="status">Session image unavailable while disconnected.</p>
      ) : (
        <>
          <p role="status">
            {status === "waiting"
              ? "Waiting for the first session image from the telescope…"
              : status === "live"
                ? "Updates automatically as the telescope publishes session images."
                : "Could not load the session image. Capture continues independently."}
          </p>
          {status !== "error" && (
            <img
              key={attempt}
              ref={image}
              src={source}
              alt="Current astronomy session image"
              style={{ width: "100%", maxHeight: "65vh", objectFit: "contain" }}
              onLoad={(event) => {
                if (event.currentTarget === image.current && !signal?.aborted)
                  setStatus("live");
              }}
              onError={(event) => {
                if (event.currentTarget === image.current && !signal?.aborted)
                  setStatus("error");
              }}
            />
          )}
          {status === "error" && (
            <button
              className="dw-button is-secondary"
              onClick={() => {
                setStatus("waiting");
                setAttempt((value) => value + 1);
              }}
            >
              Retry session image
            </button>
          )}
        </>
      )}
      <p className="mt-2">
        <Link href="/image-session">View saved session images</Link>
      </p>
    </section>
  );
}
