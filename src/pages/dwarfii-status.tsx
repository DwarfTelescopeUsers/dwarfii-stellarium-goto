import DwarfIIStatus from "@/components/DwarfIIStatus";
import StatusBar from "@/components/shared/StatusBar";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";

export default function DwarfiiStatusPage() {
  useSetupConnection();
  useLoadIntialValues();

  return (
    <div>
      <StatusBar />
      <DwarfIIStatus />
    </div>
  );
}
