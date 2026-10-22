import React from "react";
import DwarfiumMosaicPlanner from "@/components/mosaic/DwarfiumMosaicPlanner";
import PageHeader from "@/components/shared/PageHeader";

export default function WeatherForeCast() {
  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Plan"
        title="Mosaic planner"
        description="Frame wide targets across multiple panels and prepare a repeatable capture plan."
      />
      <section className="dw-panel dw-tool-panel">
        <DwarfiumMosaicPlanner />
      </section>
    </div>
  );
}
