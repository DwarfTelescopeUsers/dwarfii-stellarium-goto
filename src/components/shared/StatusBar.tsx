import { useContext } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";

type PropType = {
  mode: string;
};
export default function StatusBar(props: PropType) {
  const { mode } = props;
  let connectionCtx = useContext(ConnectionContext);

  let connection = connectionCtx.connectionStatus
    ? "Connected"
    : "Not Connected";

  let coords =
    `Lat: ${connectionCtx.latitude?.toFixed(4) || "--"}, ` +
    `Lon: ${connectionCtx.longitude?.toFixed(4) || "--"}`;

  let gain: string | number = "";
  if (connectionCtx.gain == undefined) {
    gain = "--";
  } else if (connectionCtx.gainMode === 0) {
    gain = "Auto";
  } else {
    gain = connectionCtx.gain;
  }

  let exp: string | number = "";
  if (connectionCtx.exposure == undefined) {
    exp = "--";
  } else if (connectionCtx.exposureMode === 0) {
    exp = "Auto";
  } else {
    exp = connectionCtx.exposure;
  }

  let IR =
    connectionCtx.IR === undefined
      ? "--"
      : `${connectionCtx.IR === 0 ? "Cut" : "Pass"}`;

  let binning =
    connectionCtx.binning === undefined
      ? "--"
      : `${connectionCtx.binning === 0 ? "1x1" : "2x2"}`;

  let raDec =
    `RA: ${connectionCtx.RA?.toFixed(4) || "--"}, ` +
    `Dec: ${connectionCtx.declination?.toFixed(4) || "--"}`;

  let fileFormat =
    connectionCtx.fileFormat === undefined ? "--" : connectionCtx.fileFormat;

  if (mode === "astro") {
    return (
      <div className="mb-2">
        <span>{connection}</span>
        <span className="ms-4"> {coords}</span>
        <span className="ms-4">{raDec}</span>
        <br />
        <span>Gain: {gain}</span>
        <span className="ms-4">Exp: {exp}</span>
        <span className="ms-4">IR: {IR}</span>
        <span className="ms-4">Binning: {binning}</span>
        <span className="ms-4">Format: {fileFormat}</span>
      </div>
    );
  } else if (mode === "photo") {
    return (
      <div className="mb-2">
        <span>{connection}</span>
        <span className="ms-4"> {coords}</span>
        <br />
        <span>Gain: {gain}</span>
        <span className="ms-4">Exp: {exp}</span>
      </div>
    );
  } else {
    return (
      <div className="mb-2">
        <span>{connection}</span>
        <span className="ms-4"> {coords}</span>
      </div>
    );
  }
}
