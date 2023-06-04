import ConnectDwarf from "@/components/ConnectDwarf";
import ConnectStellarium from "@/components/ConnectStellarium";

import SetLocation from "@/components/SetLocation";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import StatusBar from "@/components/shared/StatusBar";

export default function SetupScope() {
  useSetupConnection();

  return (
    <div>
      <StatusBar mode="setup" />
      <ConnectDwarf />
      <hr />
      <ConnectStellarium />
      <hr />
      <SetLocation />
    </div>
  );
}
