import { useState } from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ConnectionContext } from "@/stores/ConnectionContext";
import DwarfCameras from "@/components/DwarfCameras";

jest.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({ children }) => <>{children}</>,
  TransformComponent: ({ children }) => <>{children}</>,
  useControls: () => ({
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    resetTransform: jest.fn(),
  }),
}));
jest.mock("@/services/dwarf", () => ({
  DwarfIP: "192.0.2.1",
  wideangleURL: () => "http://192.0.2.1/wide.jpg",
  telephotoURL: () => "http://192.0.2.1/tele.jpg",
}));
jest.mock("@/lib/get_proxy_url", () => ({
  getProxyUrl: () => "http://localhost:8860",
  getMediaMTXUrl: () => "localhost",
  getTransfomProxyImageUrl: (url) => url,
}));
jest.mock("@/services/dwarf/previewPaths", () => ({
  devicePreviewPath: (_host, camera) => `dwarf_test_${camera}`,
  ensureDevicePreviewPaths: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/dwarf_utils", () => ({
  telephotoCamera: 0,
  wideangleCamera: 1,
  get_error: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({ logger: jest.fn() }));

test.each([0, 1])(
  "first camera %i attaches after its initially unknown stream becomes available",
  async (camera) => {
    const socket: any = {
      IPDwarf: "192.0.2.1",
      isConnected: () => true,
      currentClient: {},
      session: { state: { generation: 1, ownership: "control" } },
      request: jest.fn(),
    };
    function Page() {
      const [streams, setStreams] = useState({ tele: 0, wide: 0 });
      let reads = 0;
      socket.request.mockImplementation(async (operation) => {
        if (operation === "getDeviceState" && ++reads > 1)
          setStreams({ tele: 1, wide: 1 });
        return {
          data: {
            teleCameraStateInfo: { exclusiveState: {} },
            wideCameraStateInfo: { exclusiveState: {} },
          },
        };
      });
      const context: any = {
        IPDwarf: "192.0.2.1",
        socketIPDwarf: socket,
        typeIdDwarf: 2,
        isFullScreenCameraTele: true,
        connectionStatusSlave: false,
        streamTypeTeleDwarf: streams.tele,
        streamTypeWideDwarf: streams.wide,
      };
      return (
        <ConnectionContext.Provider value={context}>
          <DwarfCameras
            setExchangeCamerasStatus={jest.fn()}
            showWideangle
            useRawPreviewURL={false}
            showControls
          />
        </ConnectionContext.Provider>
      );
    }
    const view = render(<Page />);
    fireEvent.click(
      view.getByRole("button", {
        name: camera === 0 ? /go live: telephoto/i : /go live: wide-angle/i,
      }),
    );
    await waitFor(() =>
      expect(
        view.container.querySelector(
          camera === 0 ? "#idTeleCamera" : "#idWideCamera",
        ),
      ).toHaveAttribute(
        "src",
        `http://localhost:8888/dwarf_test_${camera === 0 ? "tele" : "wide"}`,
      ),
    );
    expect(
      socket.request.mock.calls.filter(
        ([op]) => op === (camera === 0 ? "goLiveTele" : "goLiveWide"),
      ),
    ).toHaveLength(1);
  },
);
