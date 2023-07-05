import { useContext, useState } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { IRCut } from "dwarfii_api";
import { calculateElapsedTime } from "@/lib/date_utils";
import { padNumber } from "@/lib/math_utils";

export default function StatusBar() {
  let connectionCtx = useContext(ConnectionContext);
  const [sessionTime, setSessionTime] = useState("");

  let connection = connectionCtx.connectionStatus ? (
    <i className="bi bi-check-circle" style={{ color: "green" }}></i>
  ) : (
    <i className="bi bi-x-circle" style={{ color: "red" }}></i>
  );

  let connectionStellarium = connectionCtx.connectionStatusStellarium ? (
    <i className="bi bi-check-circle" style={{ color: "green" }}></i>
  ) : (
    <i className="bi bi-x-circle" style={{ color: "red" }}></i>
  );

  function calculateSessionTime() {
    let data = calculateElapsedTime(
      connectionCtx.astroSession.startTime,
      Date.now()
    );
    if (data) {
      let time = `${padNumber(data.hours)}:${padNumber(
        data.minutes
      )}:${padNumber(data.seconds)}`;
      setSessionTime(time);
    }
  }

  setInterval(() => {
    calculateSessionTime();
  }, 2000);

  return (
    <div className="mb-2">
      <span className="me-3">Dwarf II: {connection}</span>
      <span className="me-3">Stellarium: {connectionStellarium}</span>
      {connectionCtx.astroSettings.gain !== undefined && (
        <span className="me-3">Gain: {connectionCtx.astroSettings.gain}</span>
      )}
      {connectionCtx.astroSettings.exposure !== undefined && (
        <span className="me-3">
          Exp: {connectionCtx.astroSettings.exposure}
        </span>
      )}
      {connectionCtx.astroSettings.IR !== undefined && (
        <span className="me-3">
          IR: {connectionCtx.astroSettings.IR === IRCut ? "Cut" : "Pass"}
        </span>
      )}
      {Object.keys(connectionCtx.astroSession).length > 0 && (
        <span className="me-3">
          Total: {connectionCtx.astroSettings.count}, Taken:{" "}
          {connectionCtx.astroSession.imagesTaken}, Time: {sessionTime}
        </span>
      )}
    </div>
  );
}
