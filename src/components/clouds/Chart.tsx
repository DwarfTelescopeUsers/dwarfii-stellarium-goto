import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import i18n from "@/i18n";

export interface ChartDataProps {
  forecastTimes: string[];
  cloudArray: string[];
  humidityArray: string[];
  windArray: string[];
}

const Chart = ({
  forecastTimes,
  cloudArray,
  humidityArray,
  windArray,
}: ChartDataProps) => {
  const { t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    }
  }, []);

  const average = (values: string[]) =>
    values.length
      ? Math.round(
          values.reduce((total, value) => total + Number(value), 0) /
            values.length,
        )
      : 0;
  const maximumWind = windArray.length
    ? Math.max(...windArray.map(Number)).toFixed(1)
    : "0.0";

  return (
    <div className="chart-weather-wrapper">
      <div className="dw-forecast-summary" aria-label="Forecast summary">
        <div className="dw-metric-card">
          <span>Average cloud cover</span>
          <strong>{average(cloudArray)}%</strong>
        </div>
        <div className="dw-metric-card">
          <span>Average humidity</span>
          <strong>{average(humidityArray)}%</strong>
        </div>
        <div className="dw-metric-card">
          <span>Maximum wind</span>
          <strong>{maximumWind} m/s</strong>
        </div>
        <div className="dw-metric-card">
          <span>Observing window</span>
          <strong>
            {forecastTimes[0]}–{forecastTimes[forecastTimes.length - 1]}
          </strong>
        </div>
      </div>
      <div className="chart-container">
        <Line
          data={{
            labels: forecastTimes,
            datasets: [
              {
                label: t("cCloudsChartCloudCover"),
                data: cloudArray,
                borderColor: "rgba(255, 99, 132, 0.9)",
                backgroundColor: "rgba(255, 99, 132, 0.3)",
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: "rgba(255, 99, 132, 1)",
                tension: 0.4,
              },
              {
                label: t("cCloudsChartHumidity"),
                data: humidityArray,
                borderColor: "rgba(54, 162, 235, 0.9)",
                backgroundColor: "rgba(54, 162, 235, 0.3)",
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: "rgba(54, 162, 235, 1)",
                tension: 0.4,
              },
              {
                label: t("cCloudsChartWindSpeed"),
                data: windArray,
                borderColor: "rgba(255, 206, 86, 0.9)",
                backgroundColor: "rgba(255, 206, 86, 0.3)",
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: "rgba(255, 206, 86, 1)",
                tension: 0.4,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: t("cCloudsChartForecast"),
                font: {
                  size: 20,
                  weight: "bold",
                },
                padding: 15,
                color: "#ffffff",
              },
              legend: {
                display: true,
                labels: {
                  font: {
                    size: 14,
                  },
                  color: "#ffffff",
                  padding: 10,
                },
              },
            },
            scales: {
              x: {
                grid: {
                  display: true,
                  color: "rgba(255, 255, 255, 0.2)",
                },
                ticks: {
                  color: "white",
                  font: {
                    size: window.innerWidth < 768 ? 10 : 14,
                  },
                },
              },
              y: {
                grid: {
                  display: true,
                  color: "rgba(255, 255, 255, 0.2)",
                },
                border: {
                  display: true,
                  dash: [5, 5],
                },
                ticks: {
                  color: "white",
                  font: {
                    size: window.innerWidth < 768 ? 10 : 14,
                  },
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
};
export default Chart;
