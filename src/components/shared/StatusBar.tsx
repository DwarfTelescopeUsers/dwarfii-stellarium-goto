import { useContext } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { IRCut } from "dwarfii_api";

export default function StatusBar() {
  let connectionCtx = useContext(ConnectionContext);

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

  return (
    <div className="mb-2">
      {/* {JSON.stringify(connectionCtx.astroSettings, null, 2)}
      <br />
      {JSON.stringify(connectionCtx.imagingSession, null, 2)}
      <br /> */}
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
      {connectionCtx.astroSettings.count !== undefined && (
        <span className="me-3">Count: {connectionCtx.astroSettings.count}</span>
      )}
      {Object.keys(connectionCtx.imagingSession).length > 0 && (
        <>
          <span className="me-3">
            Taken: {connectionCtx.imagingSession.imagesTaken}
          </span>
          <span className="me-3">
            Time: {connectionCtx.imagingSession.sessionElaspsedTime}
          </span>
        </>
      )}
    </div>
  );
}
