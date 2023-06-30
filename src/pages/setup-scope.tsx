import ConnectDwarf from "@/components/ConnectDwarf";
import ConnectStellarium from "@/components/ConnectStellarium";

import SetLocation from "@/components/SetLocation";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import StatusBar from "@/components/shared/StatusBar";
import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";
import AppDebugger from "@/components/AppDebugger";

export default function SetupScope() {
  useSetupConnection();
  useLoadIntialValues();

  return (
    <div>
      <StatusBar mode="setup" />
      <SetLocation />
      <hr />
      <ConnectDwarf />
      <hr />
      <ConnectStellarium />
      <hr />
      <AppDebugger />
    </div>
  );
}
