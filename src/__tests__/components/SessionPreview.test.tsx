import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import SessionPreview from "@/components/imaging/SessionPreview";
import { ConnectionContext } from "@/stores/ConnectionContext";
import type { ConnectionContextType } from "@/types";

jest.mock("@/services/dwarf", () => ({
  telephotoURL: (host: string) => `http://${host}/mainstream`,
  wideangleURL: (host: string) => `http://${host}/secondstream`,
}));
jest.mock("@/lib/get_proxy_url", () => ({
  getProxyUrl: () => "http://localhost:8860",
  getTransfomProxyImageUrl: (url: string, proxy: string) =>
    `${proxy}?target=${encodeURIComponent(url)}`,
}));

function setup() {
  let listener: any;
  const detach = jest.fn();
  const request = jest.fn();
  const close = jest.fn();
  const socket: any = {
    isConnected: () => true,
    session: { state: { generation: 1, ownership: "control" } },
    currentClient: {
      subscribe: jest.fn((callback) => {
        listener = callback;
        return detach;
      }),
      close,
      request,
    },
    request,
  };
  const abort = new AbortController();
  const context = {
    typeUidDwarf: "dwarf-a",
    IPDwarf: "192.0.2.1",
    socketIPDwarf: socket,
    deviceOperationSignal: abort.signal,
    imagingSession: { isRecording: true, astroCamera: 0, startTime: 100 },
  } as unknown as ConnectionContextType;
  const page = (value = context) => (
    <ConnectionContext.Provider value={value}>
      <SessionPreview />
    </ConnectionContext.Provider>
  );
  const view = render(page());
  return {
    context,
    socket,
    abort,
    request,
    close,
    detach,
    view,
    rerender: (value = context) => view.rerender(page(value)),
    notify: (packet: unknown, generation = 1) =>
      act(() => listener({ session: { phase: "ready", generation } }, packet)),
  };
}

test("automatically attaches the session image without sending control commands", () => {
  const { request, close } = setup();
  const image = screen.getByRole("img", {
    name: "Current astronomy session image",
  });
  expect(image).toHaveAttribute(
    "src",
    "http://localhost:8860?target=http%3A%2F%2F192.0.2.1%2Fmainstream",
  );
  expect(screen.getByText(/Waiting for the first session image/)).toBeVisible();
  fireEvent.load(image);
  expect(screen.getByText(/Updates automatically/)).toBeVisible();
  expect(request).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});

test("shows camera-specific progress without treating another camera as this session", () => {
  const { notify } = setup();
  notify({
    known: true,
    moduleId: 15,
    type: 2,
    cmd: 15209,
    data: { currentCount: 4, stackedCount: 3 },
  });
  expect(screen.getByText(/4 frames captured, 3 stacked/)).toBeVisible();
  notify({
    known: true,
    moduleId: 15,
    type: 2,
    cmd: 15237,
    data: { currentCount: 20, stackedCount: 19 },
  });
  expect(screen.getByText(/4 frames captured, 3 stacked/)).toBeVisible();
});

test("failed image can retry independently of capture", () => {
  const { request } = setup();
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByText(/Capture continues independently/)).toBeVisible();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry session image" }));
  fireEvent.load(screen.getByRole("img"));
  expect(screen.getByText(/Updates automatically/)).toBeVisible();
  expect(request).not.toHaveBeenCalled();
});

test.each(["device", "socket", "generation", "camera", "session"])(
  "%s change clears image loading state and previous progress",
  (change) => {
    const { context, socket, notify, rerender, detach } = setup();
    fireEvent.load(screen.getByRole("img"));
    notify({
      known: true,
      moduleId: 15,
      type: 2,
      cmd: 15209,
      data: { currentCount: 4, stackedCount: 3 },
    });
    const updated = {
      ...context,
      imagingSession: { ...context.imagingSession },
    };
    if (change === "device") {
      updated.typeUidDwarf = "dwarf-b";
      updated.IPDwarf = "192.0.2.2";
    }
    if (change === "socket") updated.socketIPDwarf = { ...socket };
    if (change === "generation") socket.session.state.generation = 2;
    if (change === "camera") updated.imagingSession.astroCamera = 1;
    if (change === "session") updated.imagingSession.startTime = 200;
    rerender(updated);
    expect(detach).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/Waiting for the first session image/),
    ).toBeVisible();
    expect(screen.queryByText(/4 frames captured/)).not.toBeInTheDocument();
    if (change === "camera")
      expect(screen.getByRole("img")).toHaveAttribute(
        "src",
        expect.stringContaining("secondstream"),
      );
  },
);

test("page cancellation and connection generation changes remove the stream", () => {
  const first = setup();
  act(() => first.abort.abort());
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText(/unavailable while disconnected/)).toBeVisible();
  first.view.unmount();
  const second = setup();
  second.notify(undefined, 2);
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  second.view.unmount();
  expect(second.detach).toHaveBeenCalled();
  expect(second.close).not.toHaveBeenCalled();
});

test("Fleet's actual camera capture state selects wide and simultaneous session streams", () => {
  const { context, rerender } = setup();
  rerender({
    ...context,
    sessionPreviewCameras: [{ cameraId: 1, revision: 1 }],
  });
  expect(screen.getByRole("img")).toHaveAttribute(
    "src",
    expect.stringContaining("secondstream"),
  );
  rerender({
    ...context,
    sessionPreviewCameras: [
      { cameraId: 0, revision: 1 },
      { cameraId: 1, revision: 1 },
    ],
  });
  expect(screen.getAllByRole("img")).toHaveLength(2);
  rerender({ ...context, sessionPreviewCameras: [] });
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

test("a fresh operation scope reattaches after the previous page scope was cancelled", () => {
  const { context, abort, rerender } = setup();
  act(() => abort.abort());
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  rerender({ ...context, deviceOperationSignal: new AbortController().signal });
  expect(screen.getByRole("img")).toBeInTheDocument();
});

test("new Fleet capture revision resets a previously displayed session image", () => {
  const { context, rerender } = setup();
  rerender({
    ...context,
    sessionPreviewCameras: [{ cameraId: 0, revision: 1 }],
  });
  const previous = screen.getByRole("img");
  fireEvent.load(previous);
  rerender({
    ...context,
    sessionPreviewCameras: [{ cameraId: 0, revision: 2 }],
  });
  expect(screen.getByRole("img")).not.toBe(previous);
  expect(screen.getByText(/Waiting for the first session image/)).toBeVisible();
  fireEvent.load(previous);
  expect(screen.getByText(/Waiting for the first session image/)).toBeVisible();
});
