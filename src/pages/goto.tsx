import { useState } from "react";

import StellariumGoto from "@/components/ManualGoto";
import AutoGoto from "@/components/AutoGoto";
import StatusBar from "@/components/shared/StatusBar";
import { useSetupConnection } from "@/hooks/useSetupConnection";

export default function Goto() {
  const [gotoType, setGotoType] = useState("lists");
  useSetupConnection();

  return (
    <div>
      <StatusBar mode="goto" />
      <ul className="nav nav-tabs mb-2">
        <li
          className={`nav-item nav-link ${
            gotoType === "lists" ? "active" : ""
          }`}
          onClick={() => setGotoType("lists")}
        >
          Lists
        </li>
        <li
          className={`nav-item nav-link ${
            gotoType === "manual" ? "active" : ""
          }`}
          onClick={() => setGotoType("manual")}
        >
          Manual
        </li>
      </ul>
      {gotoType === "lists" && <AutoGoto />}
      {gotoType === "manual" && <StellariumGoto />}
    </div>
  );
}
