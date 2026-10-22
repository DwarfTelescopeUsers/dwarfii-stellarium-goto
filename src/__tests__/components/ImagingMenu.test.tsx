import React from "react";
import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import ImagingMenu from "@/components/imaging/ImagingMenu";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { startCurrentAstroCapture } from "@/services/dwarf";
import { saveImagingSessionDb } from "@/db/db_utils";
import type { ConnectionContextType } from "@/types";

jest.mock("@/stores/ConnectionContext", () => ({
  ConnectionContext: jest
    .requireActual<typeof React>("react")
    .createContext({}),
}));
jest.mock("@/services/dwarf", () => ({ startCurrentAstroCapture: jest.fn() }));
jest.mock("@/db/db_utils", () => ({
  saveImagingSessionDb: jest.fn(),
  removeImagingSessionDb: jest.fn(),
}));
jest.mock("@/components/imaging/ImagingAstroSettings", () => () => null);
jest.mock("@/components/imaging/CameraAddOn", () => () => null);
jest.mock("@/lib/dwarf_utils", () => ({
  wideangleCamera: 1,
  calculateSessionTime: jest.fn(),
  turnOnTeleCameraFn: jest.fn(),
  turnOnWideCameraFn: jest.fn(),
  updateTelescopeISPSetting: jest.fn(),
}));

const startCapture = jest.mocked(startCurrentAstroCapture);

function mountMenu(overrides: Record<string, unknown> = {}) {
  let receive: ((sender: string, packet: any) => void) | undefined;
  let state: ((ready: boolean) => void) | undefined;
  const socket = {
    request: jest.fn().mockResolvedValue({ known: true, type: 1, data: {} }),
    prepare: jest.fn((_packets, _sender, _commands, message, onState) => {
      receive = message;
      state = onState;
      return Promise.resolve();
    }),
    stopCallbacks: jest.fn(),
  };
  const context = {
    IPDwarf: "192.0.2.1",
    typeIdDwarf: 4,
    connectionStatus: true,
    currentAstroCamera: 0,
    astroSettings: { IR: 0, exposure: 120, gain: 60, count: 1 },
    imagingSession: {},
    timerGlobal: 1,
    setTimerGlobal: jest.fn(),
    setImagingSession: jest.fn(),
    setValueFocusDwarf: jest.fn(),
    socketIPDwarf: socket,
    ...overrides,
  } as unknown as ConnectionContextType;
  const view = render(
    <ConnectionContext.Provider value={context}>
      <ImagingMenu
        exchangeCamerasStatus={false}
        setShowWideangle={jest.fn()}
        setUseRawPreviewURL={jest.fn()}
      />
    </ConnectionContext.Provider>,
  );
  return {
    ...view,
    socket,
    context,
    notify(cmd: number, data: Record<string, unknown>, type = 2, known = true) {
      act(() => receive?.("test", { cmd, moduleId: 9, data, type, known }));
    },
    disconnect() {
      act(() => state?.(false));
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  startCapture.mockResolvedValue({ phase: "awaiting-progress" } as never);
  jest.spyOn(console, "debug").mockImplementation(() => undefined);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe("ImagingMenu current focus requests", () => {
  test("astro autofocus is one semantic mode-1 request, without infinity initialization", async () => {
    const { socket, context, notify } = mountMenu();
    fireEvent.click(
      screen.getByRole("button", { name: "Start astrophotography autofocus" }),
    );
    await waitFor(() =>
      expect(socket.request).toHaveBeenCalledWith("astroAutoFocus", {
        mode: 1,
      }),
    );
    expect(socket.request).toHaveBeenCalledTimes(1);
    expect(context.setValueFocusDwarf).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "Autofocus request accepted. Waiting for telescope focus state.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Autofocus complete.")).not.toBeInTheDocument();
    notify(15278, { state: 1 });
    expect(screen.getByText("Autofocus in progress.")).toBeInTheDocument();
    notify(15280, { state: 3 });
    expect(screen.getByText("Autofocus complete.")).toBeInTheDocument();
  });

  test("autofocus stop ACK preserves active state until the stop notification", async () => {
    const { socket, notify } = mountMenu();
    notify(15278, { state: 1 });
    fireEvent.click(
      screen.getByRole("button", { name: "Stop astrophotography autofocus" }),
    );
    expect(
      await screen.findByText(
        "Focus stop accepted. Waiting for the telescope.",
      ),
    ).toBeInTheDocument();
    expect(socket.request).toHaveBeenCalledWith("stopAstroAutoFocus", {});
    expect(
      screen.getByRole("button", { name: "Stop astrophotography autofocus" }),
    ).toBeInTheDocument();
    notify(15278, { state: 3 });
    expect(screen.getByText("Autofocus stopped.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start astrophotography autofocus" }),
    ).toBeInTheDocument();
  });

  test("a rejected stop does not claim the device stopped focusing", async () => {
    const { socket, notify } = mountMenu();
    notify(15278, { state: 1 });
    socket.request.mockRejectedValueOnce(new Error("Stop rejected by device"));
    fireEvent.click(
      screen.getByRole("button", { name: "Stop astrophotography autofocus" }),
    );
    expect(
      await screen.findByText("Stop rejected by device"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Stop astrophotography autofocus" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Autofocus stopped.")).not.toBeInTheDocument();
  });

  test.each([
    ["Focus one step forward", 0],
    ["Focus one step backward", 1],
  ])(
    "manual %s uses direction %i without reporting movement completed",
    async (label, direction) => {
      const { socket, context, notify } = mountMenu();
      fireEvent.click(screen.getByRole("button", { name: String(label) }));
      await waitFor(() =>
        expect(socket.request).toHaveBeenCalledWith("focusStep", { direction }),
      );
      expect(
        await screen.findByText(
          "Focus step accepted. Waiting for telescope position.",
        ),
      ).toBeInTheDocument();
      expect(context.setValueFocusDwarf).not.toHaveBeenCalled();
      notify(15257, { pos: 0 });
      expect(context.setValueFocusDwarf).toHaveBeenCalledWith(0);
    },
  );

  test("release stops held continuous focus once, not every pointer leave", async () => {
    const { socket } = mountMenu();
    const button = screen.getByRole("button", {
      name: "Hold to focus forward",
    });
    fireEvent.pointerLeave(button);
    expect(socket.request).not.toHaveBeenCalled();
    fireEvent.pointerDown(button);
    expect(socket.request).toHaveBeenCalledWith("focusContinuous", {
      direction: 0,
    });
    fireEvent.pointerUp(button);
    fireEvent.pointerLeave(button);
    await waitFor(() =>
      expect(socket.request).toHaveBeenCalledWith("stopFocus", {}),
    );
    expect(
      socket.request.mock.calls.filter(([command]) => command === "stopFocus"),
    ).toHaveLength(1);
    expect(
      screen.queryByText("Focus movement stopped."),
    ).not.toBeInTheDocument();
  });

  test("disposing the UI unregisters notifications and stops a held focus movement", () => {
    const { socket, unmount } = mountMenu();
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Hold to focus backward" }),
    );
    unmount();
    expect(socket.stopCallbacks).toHaveBeenCalledWith(
      "ImagingMenu:operation-state",
    );
    expect(socket.request).toHaveBeenCalledWith("stopFocus");
  });

  test("late ACKs cannot overwrite an authoritative completion notification", async () => {
    const { socket, notify } = mountMenu();
    let acknowledge: ((value: unknown) => void) | undefined;
    socket.request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          acknowledge = resolve;
        }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Start astrophotography autofocus" }),
    );
    notify(15278, { state: 3 });
    await act(async () => acknowledge?.({ data: {} }));
    expect(screen.getByText("Autofocus complete.")).toBeInTheDocument();
  });

  test("disconnect invalidates pending feedback and unknown packets have no state authority", async () => {
    const { socket, notify, disconnect } = mountMenu();
    let acknowledge: ((value: unknown) => void) | undefined;
    socket.request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          acknowledge = resolve;
        }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Start astrophotography autofocus" }),
    );
    notify(15278, { state: 3 }, 1);
    notify(15278, { state: 3 }, 2, false);
    expect(screen.queryByText("Autofocus complete.")).not.toBeInTheDocument();
    disconnect();
    await act(async () => acknowledge?.({ data: {} }));
    expect(
      screen.getByText("Focus state unavailable while disconnected."),
    ).toBeInTheDocument();
  });
});

describe("ImagingMenu authoritative capture state", () => {
  test.each([
    [4, 0],
    [4, 1],
    [2, 0],
    [2, 1],
    [2, 2],
  ])(
    "delegates hardware %i / UI filter %i unchanged to the capture service",
    async (hardwareId, selectedFilter) => {
      const { context, socket } = mountMenu({
        typeIdDwarf: hardwareId,
        astroSettings: {
          IR: selectedFilter,
          exposure: 120,
          gain: 60,
          count: 1,
        },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Start astrophotography capture" }),
      );
      await waitFor(() => expect(startCapture).toHaveBeenCalledWith(context));
      expect(context.astroSettings.IR).toBe(selectedFilter);
      expect(socket.request).not.toHaveBeenCalled();
      expect(context.setImagingSession).not.toHaveBeenCalled();
      expect(saveImagingSessionDb).not.toHaveBeenCalledWith(
        "isRecording",
        "true",
      );
      expect(
        await screen.findByText(
          "Capture request accepted. Waiting for telescope progress.",
        ),
      ).toBeInTheDocument();
    },
  );

  test("rejected start reports its error without creating a recording session", async () => {
    startCapture.mockRejectedValueOnce(
      new Error("Capture parameters rejected"),
    );
    const { context } = mountMenu();
    fireEvent.click(
      screen.getByRole("button", { name: "Start astrophotography capture" }),
    );
    expect(
      await screen.findByText("Capture parameters rejected"),
    ).toBeInTheDocument();
    expect(context.setImagingSession).not.toHaveBeenCalled();
    expect(saveImagingSessionDb).not.toHaveBeenCalled();
  });

  test.each([
    [0, "stopTeleCapture"],
    [1, "stopWideCapture"],
  ])(
    "camera %i stop request does not mark recording idle on its ACK",
    async (camera, operation) => {
      const { socket, context, notify } = mountMenu({
        currentAstroCamera: camera,
        imagingSession: { isRecording: true },
        astroSettings: {
          IR: 0,
          exposure: 120,
          gain: 60,
          wideExposure: 120,
          wideGain: 60,
          count: 1,
        },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Stop astrophotography capture" }),
      );
      await waitFor(() =>
        expect(socket.request).toHaveBeenCalledWith(operation),
      );
      expect(
        await screen.findByText(
          "Stop request accepted. Waiting for the telescope to stop.",
        ),
      ).toBeInTheDocument();
      expect(context.setImagingSession).not.toHaveBeenCalled();
      notify(camera === 0 ? 15208 : 15236, { state: 3 });
      expect(screen.getByText("Capture stopped.")).toBeInTheDocument();
      expect(context.setImagingSession).not.toHaveBeenCalled();
    },
  );

  test("rejected capture stop preserves the recording session", async () => {
    const { socket, context } = mountMenu({
      imagingSession: { isRecording: true },
    });
    socket.request.mockRejectedValueOnce(new Error("Capture stop rejected"));
    fireEvent.click(
      screen.getByRole("button", { name: "Stop astrophotography capture" }),
    );
    expect(
      await screen.findByText("Capture stop rejected"),
    ).toBeInTheDocument();
    expect(context.setImagingSession).not.toHaveBeenCalled();
    expect(saveImagingSessionDb).not.toHaveBeenCalledWith(
      "isRecording",
      "false",
    );
  });
});
