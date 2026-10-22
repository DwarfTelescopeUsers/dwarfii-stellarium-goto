import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import FleetConnectionSetup from "@/components/setup/FleetConnectionSetup";
import { useSelectedFleetDevice } from "@/components/fleet/FleetWorkspace";

jest.mock("@/components/fleet/FleetWorkspace", () => ({
  useSelectedFleetDevice: jest.fn(),
}));
jest.mock("@/components/setup/ConnectDwarf", () => ({
  __esModule: true,
  default: () => <p>Legacy setup form</p>,
}));

test("connection setup reflects the selected Fleet connection instead of legacy readiness", () => {
  jest.mocked(useSelectedFleetDevice).mockReturnValue({
    device: { alias: "D3", lastKnownHost: "192.0.2.99" },
    controller: { getConnectionHost: () => "192.0.2.1" },
    runtime: { connection: "connected", ownership: "control" },
  } as any);
  render(<FleetConnectionSetup />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "D3 (192.0.2.1) — connected through Fleet. You have control.",
  );
  expect(screen.getByText("Legacy setup form")).not.toBeVisible();
});

test("disconnected selection leaves setup available for a new connection", () => {
  jest
    .mocked(useSelectedFleetDevice)
    .mockReturnValue({ runtime: { connection: "disconnected" } } as any);
  render(<FleetConnectionSetup />);
  expect(screen.getByText("Legacy setup form")).toBeVisible();
});
