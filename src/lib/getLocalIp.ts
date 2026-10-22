import os from "os";

export function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  let localIPs: string[] = [];

  console.log("Start getLocalIPAddress.");

  for (const key in interfaces) {
    const iface = interfaces[key];
    if (Array.isArray(iface)) {
      for (const entry of iface) {
        if (
          (entry.family === "IPv4" || (entry.family as any) === 4) &&
          !entry.internal
        ) {
          localIPs.push(entry.address);
          console.log("getLocalIPAddress found ", entry.address);
        }
      }
    }
  }
  localIPs = localIPs.sort((a, b) => {
    if (a.startsWith("192.") && !b.startsWith("192.")) return -1;
    if (!a.startsWith("192.") && b.startsWith("192.")) return 1;
    if (a === "127.0.0.1") return 1;
    if (b === "127.0.0.1") return -1;
    return a.localeCompare(b);
  });
  console.log("getLocalIPAddress localIPs=", localIPs);
  return localIPs;
}
