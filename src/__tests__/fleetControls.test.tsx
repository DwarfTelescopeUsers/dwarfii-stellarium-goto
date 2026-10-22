import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DeviceControls from "@/components/fleet/DeviceControls";
import type { FleetDeviceController } from "@/services/fleet/controller";

function controller() {
  return {
    getSnapshot: () => ({}),
    subscribe: () => () => {},
    request: jest.fn().mockResolvedValue({}),
    gotoCoordinates: jest.fn().mockResolvedValue({}),
    capture: jest.fn().mockResolvedValue({}),
    getProfile: () => ({ scienceFilters: [{ index: 1, label: "Astro" }] }),
    loadCatalog: jest.fn(),
  };
}

test("dark-frame warning requires an explicit Continue click on the owning device", async () => {
  const c = {
    ...controller(),
    getSnapshot: () => ({
      captureWarning: "No matching dark frame was found.",
    }),
  };
  render(
    <DeviceControls
      controller={c as unknown as FleetDeviceController}
      canControl
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("No matching dark frame");
  expect(c.request).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Continue despite dark-frame warning" }),
  );
  await waitFor(() =>
    expect(c.request).toHaveBeenCalledWith("continueCapture"),
  );
});

test("observer cannot send camera or mount commands", () => {
  const c = controller();
  render(
    <DeviceControls
      controller={c as unknown as FleetDeviceController}
      canControl={false}
    />,
  );
  for (const name of [
    "Start astronomy capture",
    "Stop capture",
    "Astro autofocus (telephoto)",
    "Stop autofocus",
    "GOTO coordinates",
    "Stop GOTO",
  ])
    expect(screen.getByRole("button", { name })).toBeDisabled();
});

test("GOTO requires coordinates and safety confirmation and stays bound to its device", async () => {
  const a = controller(),
    b = controller();
  const { rerender } = render(
    <DeviceControls
      key="a"
      controller={a as unknown as FleetDeviceController}
      canControl
    />,
  );
  fireEvent.change(screen.getByLabelText("Right ascension (hours)"), {
    target: { value: "12.5" },
  });
  fireEvent.change(screen.getByLabelText("Declination (degrees)"), {
    target: { value: "30" },
  });
  expect(
    screen.getByRole("button", { name: "GOTO coordinates" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "GOTO coordinates" }));
  await waitFor(() => expect(a.gotoCoordinates).toHaveBeenCalledWith(12.5, 30));
  expect(b.gotoCoordinates).not.toHaveBeenCalled();
  rerender(
    <DeviceControls
      key="b"
      controller={b as unknown as FleetDeviceController}
      canControl
    />,
  );
  expect(screen.getByLabelText("Right ascension (hours)")).toHaveValue(null);
  expect(screen.getByRole("checkbox")).not.toBeChecked();
});

test("autofocus reports acknowledgement rather than completed focus", async () => {
  const c = controller();
  render(
    <DeviceControls
      controller={c as unknown as FleetDeviceController}
      canControl
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Astro autofocus (telephoto)" }),
  );
  await screen.findByText("Autofocus acknowledged; awaiting focus state.");
  expect(c.request).toHaveBeenCalledWith("astroAutoFocus", { mode: 1 });
});
