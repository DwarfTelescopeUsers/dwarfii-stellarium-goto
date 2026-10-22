import { useContext } from "react";
import "@testing-library/jest-dom";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { FleetProvider, useFleet } from "@/stores/FleetContext";
import {
  ConnectionContext,
  ConnectionContextProvider,
} from "@/stores/ConnectionContext";
import FleetStatusBar from "@/components/fleet/FleetStatusBar";
import FleetWorkspace from "@/components/fleet/FleetWorkspace";
import { FLEET_STORAGE_KEY } from "@/services/fleet/manager";
import type { FleetManager } from "@/services/fleet/manager";

jest.mock("next/router", () => ({ useRouter: () => ({ pathname: "/" }) }));
const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
function Page() {
  const context = useContext(ConnectionContext);
  return (
    <>
      <span data-testid="host">{context.IPDwarf}</span>
      <span data-testid="state">{String(context.connectionStatus)}</span>
    </>
  );
}
const managerRef: { current?: FleetManager } = {};
function CaptureManager() {
  managerRef.current = useFleet();
  return null;
}

function setConnection(id: string, connection: "connected" | "disconnected") {
  const controller = managerRef.current?.getDevice(id) as unknown as {
    publish: (update: { connection: "connected" | "disconnected" }) => void;
  };
  act(() => controller.publish({ connection }));
}

test("top bar shows connected telescopes only and routes the selected workspace", () => {
  localStorage.setItem(
    FLEET_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      sessions: [],
      devices: [
        {
          id: a,
          alias: "Mini",
          model: "dwarfmini",
          lastKnownHost: "192.0.2.1",
        },
        { id: b, alias: "D3", model: "dwarf3", lastKnownHost: "192.0.2.2" },
      ],
    }),
  );
  render(
    <FleetProvider>
      <ConnectionContextProvider>
        <CaptureManager />
        <FleetStatusBar />
        <FleetWorkspace>
          <Page />
        </FleetWorkspace>
      </ConnectionContextProvider>
    </FleetProvider>,
  );
  expect(screen.queryByTestId("host")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("combobox", { name: "Target device" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("No telescope connected")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /Mini connected/ }),
  ).not.toBeInTheDocument();

  setConnection(a, "connected");
  expect(screen.getByTestId("host")).toHaveTextContent("192.0.2.1");
  expect(screen.getByTestId("state")).toHaveTextContent("true");
  expect(screen.getByRole("button", { name: /Mini connected/ })).toBeVisible();
  expect(screen.queryByRole("button", { name: /D3/ })).not.toBeInTheDocument();

  // Opening an offline telescope must not silently reroute back to the other
  // connected device while the selected telescope is still connecting.
  act(() => managerRef.current!.registry.select(b));
  expect(screen.getByTestId("host")).toHaveTextContent("192.0.2.2");
  expect(screen.getByTestId("state")).toHaveTextContent("false");
  act(() => managerRef.current!.registry.select(a));

  jest
    .spyOn(managerRef.current!.getDevice(a), "getConnectionHost")
    .mockReturnValue("192.0.2.1");
  act(() => managerRef.current!.registry.updateHost(a, "192.0.2.99"));
  expect(screen.getByTestId("host")).toHaveTextContent("192.0.2.1");

  setConnection(b, "connected");
  fireEvent.click(screen.getByRole("button", { name: /D3 connected/ }));
  expect(screen.getByTestId("host")).toHaveTextContent("192.0.2.2");
  setConnection(b, "disconnected");
  expect(
    screen.queryByRole("button", { name: /D3 connected/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByTestId("host")).toHaveTextContent("192.0.2.2");
  expect(screen.getByTestId("state")).toHaveTextContent("false");
  localStorage.clear();
});
