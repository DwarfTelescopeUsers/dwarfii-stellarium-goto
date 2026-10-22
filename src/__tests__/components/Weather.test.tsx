import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import Weather from "@/components/Weather";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { ConnectionContextType } from "@/types";

jest.mock("axios");
jest.mock("@/stores/ConnectionContext", () => {
  const ReactModule = jest.requireActual<typeof React>("react");
  return { ConnectionContext: ReactModule.createContext({}) };
});
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        cCloudsSearch: "Search",
        cCloudsSaveAPIKey: "Save API key",
        cCloudsCityInput: "Enter a city",
        cCloudsApiKeyInput: "Enter an API key",
        pWeatherLoading: "Loading…",
      })[key] || key,
  }),
}));
jest.mock("@/i18n", () => ({
  __esModule: true,
  default: { changeLanguage: jest.fn() },
}));
jest.mock("@/components/weather/WeatherInfo", () => () => null);
jest.mock("@/components/weather/WeatherForecast", () => () => null);

const mockedAxios = axios as jest.Mocked<typeof axios>;

function renderWeather() {
  return render(
    <ConnectionContext.Provider value={{} as ConnectionContextType}>
      <Weather />
    </ConnectionContext.Provider>,
  );
}

describe("Weather", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedAxios.get.mockReset();
  });

  it("asks for an API key without sending an invalid request", () => {
    renderWeather();

    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Berlin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter your OpenWeather API key before loading the forecast.",
    );
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("handles an OpenWeather error payload returned through the proxy", async () => {
    localStorage.setItem("city", "Berlin");
    localStorage.setItem("apiKey", "invalid-key");
    mockedAxios.get.mockResolvedValue({
      data: { cod: 401, message: "Invalid API key" },
    });

    renderWeather();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "OpenWeather rejected the API key. Check it and try again.",
      ),
    );
  });

  it("loads the forecast with one request without saving an unsaved key", async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        cod: "200",
        city: { name: "Fürth", country: "DE", timezone: 7200 },
        list: [
          {
            dt: 1790233200,
            main: {
              temp: 15,
              temp_min: 14,
              temp_max: 18,
              feels_like: 14,
              humidity: 73,
            },
            wind: { speed: 5 },
            clouds: { all: 68 },
            pop: 0.54,
            weather: [{ description: "broken clouds", icon: "04d" }],
          },
        ],
      },
    });
    renderWeather();

    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Fürth" },
    });
    fireEvent.change(screen.getByLabelText("OpenWeather API key"), {
      target: { value: "test-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(localStorage.getItem("city")).toBe("Fürth"));
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("apiKey")).toBeNull();
  });
});
