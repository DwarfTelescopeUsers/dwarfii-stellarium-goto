import ConnectDwarf from "@/components/setup/ConnectDwarf";
import ConnectStellarium from "@/components/setup/ConnectStellarium";
import SetLocation from "@/components/setup/SetLocation";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import StatusBar from "@/components/shared/StatusBar";
import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";

export default function SetupScope() {
  useSetupConnection();
  useLoadIntialValues();

  return (
    <div>
      <StatusBar />
      <SetLocation />
      <hr />
      <ConnectDwarf />
      <hr />
      <ConnectStellarium />
    </div>
  );
}
