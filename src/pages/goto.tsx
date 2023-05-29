import { useState } from "react";

import StellariumGoto from "@/components/ManualGoto";
import AutoGoto from "@/components/AutoGoto/AutoGoto";
import StatusBar from "@/components/shared/StatusBar";
import { useSetupConnection } from "@/hooks/useSetupConnection";

export default function Goto() {
  const [gotoType, setGotoType] = useState("auto");
  useSetupConnection();

  return (
    <div>
      <StatusBar mode="goto" />
      <button className="btn btn-primary" onClick={() => setGotoType("auto")}>
        Auto
      </button>{" "}
      <button
        className="btn btn-primary"
        onClick={() => setGotoType("stellarium")}
      >
        Stellarium
      </button>
      {gotoType === "auto" && <AutoGoto />}
      {gotoType === "stellarium" && <StellariumGoto />}
    </div>
  );
}
