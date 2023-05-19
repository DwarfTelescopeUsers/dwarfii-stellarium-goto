import ConnectCamera from "@/components/ConnectCamera";
import ConnectStellarium from "@/components/ConnectStellarium";

import SetLocation from "@/components/SetLocation";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import StatusBar from "@/components/shared/StatusBar";

export default function SetupScope() {
  useSetupConnection();

  return (
    <div>
      <StatusBar mode="setup" />
      <ConnectCamera />
      <hr />
      <ConnectStellarium />
      <hr />
      <SetLocation />
    </div>
  );
}
