import React from "react";
import Weather from "@/components/Weather";
import PageHeader from "@/components/shared/PageHeader";

export default function WeatherForeCast() {
  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Conditions"
        title="Weather"
        description="Review upcoming cloud cover, rain, wind, and temperature before an observing session."
      />
      <section className="dw-panel dw-conditions-panel">
        <Weather />
      </section>
    </div>
  );
}
