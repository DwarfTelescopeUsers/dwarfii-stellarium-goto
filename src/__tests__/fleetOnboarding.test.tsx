import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RegisterConfiguredDevice from "@/components/fleet/RegisterConfiguredDevice";
import { FleetProvider } from "@/stores/FleetContext";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { FLEET_STORAGE_KEY } from "@/services/fleet/manager";

beforeEach(() => localStorage.clear());
test("configured address can be registered without connecting and without copying credentials", () => {
  render(
    <FleetProvider>
      <ConnectionContext.Provider
        value={
          { IPDwarf: "192.0.2.5", BleSTAPWDDwarf: "fixture-secret" } as any
        }
      >
        <RegisterConfiguredDevice />
      </ConnectionContext.Provider>
    </FleetProvider>,
  );
  fireEvent.change(screen.getByLabelText("Friendly name"), {
    target: { value: "Configured Mini" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save telescope to Fleet" }),
  );
  const raw = localStorage.getItem(FLEET_STORAGE_KEY)!;
  const saved = JSON.parse(raw);
  expect(saved.devices).toHaveLength(1);
  expect(saved.devices[0]).toMatchObject({
    alias: "Configured Mini",
    lastKnownHost: "192.0.2.5",
  });
  expect(raw).not.toContain("fixture-secret");
  fireEvent.click(
    screen.getByRole("button", { name: "Save telescope to Fleet" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("already registered");
  expect(
    JSON.parse(localStorage.getItem(FLEET_STORAGE_KEY)!).devices,
  ).toHaveLength(1);
});
