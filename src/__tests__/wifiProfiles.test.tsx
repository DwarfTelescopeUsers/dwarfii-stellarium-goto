import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import WifiProfiles, {
  WIFI_PROFILES_KEY,
} from "@/components/setup/WifiProfiles";

beforeEach(() => localStorage.clear());
test("credentials are saved only explicitly, reused and deleted locally", () => {
  const onUse = jest.fn();
  const { unmount } = render(
    <WifiProfiles
      ssid="Test network"
      password="fixture-password"
      onUse={onUse}
    />,
  );
  expect(localStorage.getItem(WIFI_PROFILES_KEY)).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Save current Wi-Fi profile" }),
  );
  expect(JSON.parse(localStorage.getItem(WIFI_PROFILES_KEY)!).profiles).toEqual(
    [{ ssid: "Test network", password: "fixture-password" }],
  );
  unmount();
  render(<WifiProfiles ssid="" password="" onUse={onUse} />);
  fireEvent.change(screen.getByLabelText("Local profile"), {
    target: { value: "Test network" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Use profile" }));
  expect(onUse).toHaveBeenCalledWith("Test network", "fixture-password");
  fireEvent.click(screen.getByRole("button", { name: "Delete saved profile" }));
  expect(JSON.parse(localStorage.getItem(WIFI_PROFILES_KEY)!).profiles).toEqual(
    [],
  );
});
test("malformed local data is not silently overwritten", () => {
  localStorage.setItem(WIFI_PROFILES_KEY, "invalid");
  render(<WifiProfiles ssid="Test" password="fixture" onUse={jest.fn()} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Save current Wi-Fi profile" }),
  );
  expect(localStorage.getItem(WIFI_PROFILES_KEY)).toBe("invalid");
  expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
});
