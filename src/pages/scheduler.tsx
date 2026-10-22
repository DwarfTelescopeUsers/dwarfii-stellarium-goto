import React from "react";
import AstroDwarfSessionUI from "@/components/scheduler/AstroScheduler";
import PageHeader from "@/components/shared/PageHeader";

const ObservationPlanner = () => {
  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Plan"
        title="Observation planner"
        description="Prepare targets, timing and capture recipes for repeatable DWARF imaging sessions."
      />
      <section className="dw-panel dw-tool-panel">
        <AstroDwarfSessionUI />
      </section>
    </div>
  );
};

export default ObservationPlanner;
