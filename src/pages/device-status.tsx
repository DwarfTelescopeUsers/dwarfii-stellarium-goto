import DeviceStatus from "@/components/DwarfIIStatus";
import PageHeader from "@/components/shared/PageHeader";

export default function DeviceStatusPage() {
  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Device"
        title="Device status"
        description="Inspect live telescope telemetry, hardware state and active camera settings."
      />
      <DeviceStatus />
    </div>
  );
}
