// Run against the actual standalone executable, not only the source server.
// This uses a loopback fixture; no telescope or private device data is involved.
import assert from "node:assert/strict";
import { createServer } from "node:http";

const proxy = new URL(process.argv[2] ?? "http://127.0.0.1:8860/");
if (!["127.0.0.1", "localhost", "[::1]"].includes(proxy.hostname))
  throw new Error("The smoke test requires a local proxy.");

const fixture = createServer((request, response) => {
  request.resume();
  request.on("end", () => {
    // Outbound work must outlive receipt of the complete inbound request body.
    const timer = setTimeout(() => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ code: 0, data: { deviceId: 4 } }));
    }, 100);
    response.on("close", () => clearTimeout(timer));
  });
});

await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
try {
  const target = `http://127.0.0.1:${fixture.address().port}/deviceInfo`;
  proxy.searchParams.set("target", target);
  for (const body of [undefined, "{}", JSON.stringify({ modeId: 2 })]) {
    const response = await fetch(proxy, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 200, "Proxy must not abort after receiving the inbound body");
    assert.deepEqual(await response.json(), { code: 0, data: { deviceId: 4 } });
  }
  console.log("PASS: packaged proxy completed all 3 delayed upstream requests.");
} finally {
  fixture.closeAllConnections();
  await new Promise((resolve, reject) => fixture.close((error) => error ? reject(error) : resolve()));
}
