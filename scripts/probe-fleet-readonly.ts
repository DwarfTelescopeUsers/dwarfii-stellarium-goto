// Explicit read-only Fleet diagnostic; no ownership, movement or capture commands.
import { FleetDeviceController } from "../src/services/fleet/controller";
import { decodeCurrentPacket } from "dwarfii_api";
import WebSocket from "ws";

async function main() {
  const hosts = process.argv.slice(2);
  if (!hosts.length)
    throw new Error("Provide the authorized telescope IPv4 addresses.");
  const controllers = hosts.map(
    (host) =>
      new FleetDeviceController(host, {
        webSocketFactory(url) {
          const socket = new WebSocket(url);
          const send = socket.send.bind(socket);
          socket.send = ((data: any) => {
            if (typeof data !== "string") {
              const packet = decodeCurrentPacket(new Uint8Array(data));
              if (packet.type !== 0 || packet.cmd !== 16405)
                throw new Error("Blocked non-status command");
            } else if (data !== "ping" && data !== "pong")
              throw new Error("Blocked text command");
            send(data);
          }) as typeof socket.send;
          return socket as any;
        },
      }),
  );
  try {
    controllers.forEach((controller) => {
      let previous = "";
      controller.subscribe(() => {
        const state = controller.getSnapshot();
        const report = JSON.stringify({
          host: controller.id,
          connection: state.connection,
          error: state.error,
          telemetry: state.telemetry,
        });
        if (report !== previous) {
          console.log(report);
          previous = report;
        }
      });
    });
    await Promise.all(
      controllers.map((controller) =>
        controller.connect(
          {
            id: controller.id,
            alias: "Read-only probe",
            lastKnownHost: controller.id,
          },
          "http://127.0.0.1:8860",
        ),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 45000));
  } finally {
    controllers.forEach((controller) => controller.disconnect());
  }
}
void main();
