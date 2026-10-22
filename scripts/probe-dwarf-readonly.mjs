// Explicitly invoked read-only probe. Never imported or run by the application.
import { isIP } from "node:net";
import {
  CurrentWebSocketHandler,
  decodeCurrentPacket,
  normalizeCurrentDeviceInfo,
  wsURL,
} from "dwarfii_api";

const ip = process.argv[process.argv.indexOf("--ip") + 1];
if (!process.argv.includes("--ip") || isIP(ip) !== 4)
  throw new Error("Usage: node scripts/probe-dwarf-readonly.mjs --ip <authorized IPv4>");

const response = await fetch(`http://${ip}:8082/deviceInfo`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
  signal: AbortSignal.timeout(8000),
});
if (!response.ok) throw new Error(`Device identity HTTP ${response.status}`);
const device = normalizeCurrentDeviceInfo(await response.text());
const report = {
  timestamp: new Date().toISOString(),
  model: device.profile.model,
  hardwareId: device.hardwareId,
  wireDeviceId: device.profile.wireDeviceId,
  protocol: `${device.profile.majorVersion}.${device.profile.minorVersion}`,
  sentCommands: [],
  receivedCommands: {},
  ready: false,
  telemetry: undefined,
};

const client = new CurrentWebSocketHandler(device.profile, {
  reconnectDelaysMs: [],
  webSocketFactory(url) {
    const socket = new WebSocket(url);
    const send = socket.send.bind(socket);
    socket.send = (data) => {
      if (typeof data === "string") {
        if (data !== "ping" && data !== "pong") throw new Error("Blocked non-heartbeat text");
      } else {
        const packet = decodeCurrentPacket(new Uint8Array(data));
        if (packet.type !== 0 || packet.moduleId !== 14 || packet.cmd !== 16405)
          throw new Error(`Blocked non-read-only command ${packet.moduleId}:${packet.cmd}`);
        report.sentCommands.push({ module: packet.moduleId, command: packet.cmd });
      }
      send(data);
    };
    return socket;
  },
});

try {
  await new Promise((resolve, reject) => {
    let sampling;
    const deadline = setTimeout(() => finish(new Error("Read-only probe timed out")), 35000);
    const finish = (error) => {
      clearTimeout(deadline);
      clearTimeout(sampling);
      unsubscribe();
      if (error) reject(error);
      else resolve();
    };
    const unsubscribe = client.subscribe((state, packet) => {
      if (state.error) return finish(state.error);
      if (packet) {
        report.receivedCommands[packet.cmd] = (report.receivedCommands[packet.cmd] ?? 0) + 1;
        if (packet.cmd === 16405 && (packet.data.code ?? 0) === 0) {
          const status = packet.data.deviceStateInfo;
          report.telemetry = {
            battery: status?.batteryInfo,
            charging: status?.chargingState,
            temperature: status?.temperature,
            storage: status?.storageInfo,
            telephotoTemperature: packet.data.teleCameraStateInfo?.cmosTemperature,
            shootingMode: packet.data.shootingMode ?? 0,
          };
        }
      }
      if (state.session.phase === "ready" && !report.ready) {
        report.ready = true;
        sampling = setTimeout(() => finish(), 15000);
      }
    });
    client.connect(wsURL(ip));
  });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.log(JSON.stringify({ ...report, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
} finally {
  client.close("Read-only probe finished");
}
