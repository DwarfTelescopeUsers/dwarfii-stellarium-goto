import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import SetupScope from "@/pages/setup-scope";
jest.mock("@/components/fleet/FleetWorkspace", () => ({
  useSelectedFleetDevice: () => ({ runtime: { connection: "disconnected" } }),
}));
jest.mock("next/head", () => ({
  __esModule: true,
  default: ({ children }: any) => <>{children}</>,
}));
jest.mock(
  "@/components/setup/SetLocation",
  () =>
    function MockLocation() {
      return <input aria-label="Test latitude" />;
    },
);
jest.mock(
  "@/components/setup/ConnectDwarfSTA",
  () =>
    function MockNetwork() {
      return <input aria-label="Test Wi-Fi" />;
    },
);
jest.mock(
  "@/components/setup/ConnectDwarf",
  () =>
    function MockConnect() {
      return <button>Test connect</button>;
    },
);
jest.mock(
  "@/components/setup/ConnectStellarium",
  () =>
    function MockStellarium() {
      return <input aria-label="Test planetarium" />;
    },
);
jest.mock(
  "@/components/fleet/RegisterConfiguredDevice",
  () =>
    function MockRegister() {
      return <button>Test register</button>;
    },
);

test("setup groups all existing controls and opens direct connection by default", () => {
  const { container } = render(<SetupScope />);
  const sections = Array.from(container.querySelectorAll("details"));
  expect(sections).toHaveLength(5);
  expect(sections[2]).toHaveAttribute("open");
  expect(sections[1]).not.toHaveAttribute("open");
  expect(
    screen.getByRole("link", { name: "← Fleet overview" }),
  ).toHaveAttribute("href", expect.stringMatching(/^\/fleet\/?$/));
  const wifi = screen.getByLabelText("Test Wi-Fi");
  fireEvent.change(wifi, { target: { value: "Test network" } });
  sections[1].open = true;
  sections[1].open = false;
  sections[1].open = true;
  expect(screen.getByLabelText("Test Wi-Fi")).toBe(wifi);
  expect(wifi).toHaveValue("Test network");
});
