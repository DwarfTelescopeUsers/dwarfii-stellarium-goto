import ManualGoto from "@/components/ManualGoto";
import StatusBar from "@/components/shared/StatusBar";
import { useSetupConnection } from "@/hooks/useSetupConnection";

export default function Goto() {
  useSetupConnection();

  return (
    <div>
      <StatusBar mode="goto" />
      <ManualGoto />
    </div>
  );
}
