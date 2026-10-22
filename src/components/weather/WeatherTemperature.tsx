import { useState } from "react";
import React from "react";
import Link from "next/link";
interface WeatherTemperatureProps {
  celsius: number;
}

function WeatherTemperature({ celsius }: WeatherTemperatureProps) {
  const [unit, setUnit] = useState<"celsius" | "fahrenheit">("celsius");

  function showFahrenheit(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setUnit("fahrenheit");
  }

  function showCelsius(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setUnit("celsius");
  }

  const fahrenheit = (celsius * 9) / 5 + 32;

  return (
    <div className="WeatherTemperature">
      <span className="units">
        {unit === "celsius" ? (
          <>
            ºC |{" "}
            <Link href="/" onClick={showFahrenheit}>
              ºF
            </Link>
          </>
        ) : (
          <>
            <Link href="/" onClick={showCelsius}>
              ºC
            </Link>{" "}
            | ºF
          </>
        )}
      </span>
      <p className="Temperature">
        {unit === "celsius"
          ? `${Math.round(celsius)} ºC`
          : `${Math.round(fahrenheit)} ºF`}
      </p>
    </div>
  );
}

export default WeatherTemperature;
