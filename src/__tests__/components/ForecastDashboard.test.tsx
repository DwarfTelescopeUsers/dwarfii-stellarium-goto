import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import ForecastDashboard from "@/pages/forecast";
import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  loadForecast,
  findForecastLocations,
  parseForecast,
} from "@/services/forecast";

jest.mock("@/services/forecast", () => ({
  ...jest.requireActual("@/services/forecast"),
  loadForecast: jest.fn(),
  findForecastLocations: jest.fn(),
}));
const berlin = { name: "Berlin, Germany", latitude: 52.52, longitude: 13.41 };
const tokyo = { name: "Tokyo, Japan", latitude: 35.68, longitude: 139.69 };
const getForecast = (location = berlin) =>
  parseForecast(
    {
      timezone: location === tokyo ? "Asia/Tokyo" : "Europe/Berlin",
      hourly: {
        time: Array.from(
          { length: 72 },
          (_, i) => Date.parse("2026-10-23T00:00:00Z") / 1000 + i * 3600,
        ),
        cloud_cover: Array(72).fill(38),
        temperature_2m: Array(72).fill(10),
      },
    },
    location,
  );
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  (loadForecast as jest.Mock).mockResolvedValue(getForecast());
});
function page() {
  return render(
    <ConnectionContext.Provider value={{} as any}>
      <ForecastDashboard />
    </ConnectionContext.Provider>,
  );
}

test("one saved location loads the combined forecast without a weather API key", async () => {
  localStorage.setItem("dwarfium.forecast.location.v1", JSON.stringify(berlin));
  page();
  expect(
    await screen.findByRole("heading", { name: berlin.name }),
  ).toBeVisible();
  expect(screen.getByRole("region", { name: "Cloud forecast" })).toBeVisible();
  expect(
    screen.getByRole("region", { name: "Moon and darkness" }),
  ).toBeVisible();
  expect(
    screen.getByRole("region", { name: "Hourly observing forecast" }),
  ).toBeVisible();
  expect(loadForecast).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText(/API key/i)).not.toBeInTheDocument();
  const hourButtons = screen.getAllByRole("button", { name: /cloud cover$/ });
  fireEvent.click(hourButtons[3]);
  expect(hourButtons[3]).toHaveAttribute("aria-pressed", "true");
  expect(loadForecast).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole("combobox", { name: "Observing night" }), {
    target: { value: "2026-10-24" },
  });
  expect(loadForecast).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() => expect(loadForecast).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(
      screen.getByRole("combobox", { name: "Observing night" }),
    ).toHaveValue("2026-10-24"),
  );
});

test("empty state supports choosing an ambiguous city rather than silently using the first match", async () => {
  (findForecastLocations as jest.Mock).mockResolvedValue([berlin, tokyo]);
  page();
  fireEvent.change(screen.getByLabelText("City"), {
    target: { value: "City" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find location" }));
  fireEvent.click(await screen.findByRole("button", { name: berlin.name }));
  await screen.findByRole("heading", { name: berlin.name });
  expect(loadForecast).toHaveBeenCalledWith(berlin, expect.any(AbortSignal));
});

test("a stale location response cannot overwrite a newer location, even if fetch ignores abort", async () => {
  localStorage.setItem("dwarfium.forecast.location.v1", JSON.stringify(berlin));
  let finishOld!: (value: any) => void;
  (loadForecast as jest.Mock)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    )
    .mockResolvedValueOnce(getForecast(tokyo));
  (findForecastLocations as jest.Mock).mockResolvedValue([tokyo]);
  page();
  fireEvent.change(screen.getByLabelText("City"), {
    target: { value: "Tokyo" },
  });
  fireEvent.submit(screen.getByLabelText("City").closest("form")!);
  await screen.findByRole("heading", { name: tokyo.name });
  await act(async () => finishOld(getForecast()));
  expect(
    screen.queryByRole("heading", { name: berlin.name }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: tokyo.name })).toBeVisible();
});

test("failed requests show a useful error and unmount cancels the outstanding request", async () => {
  localStorage.setItem("dwarfium.forecast.location.v1", JSON.stringify(berlin));
  (loadForecast as jest.Mock).mockRejectedValue(
    new Error("Forecast unavailable"),
  );
  const view = page();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Forecast unavailable",
  );
  await waitFor(() =>
    expect(
      screen.queryByText("Loading observing conditions…"),
    ).not.toBeInTheDocument(),
  );
  const signal = (loadForecast as jest.Mock).mock.calls[0][1];
  view.unmount();
  expect(signal.aborted).toBe(true);
});
