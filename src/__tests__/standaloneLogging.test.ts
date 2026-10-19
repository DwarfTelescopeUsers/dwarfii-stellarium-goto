/** @jest-environment node */
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInNewContext } from "node:vm";
import { execSync } from "node:child_process";

function launcher(file: string, platform: "Windows" | "LinuxMac") {
  const source = readFileSync(join(process.cwd(), "scripts", file), "utf8");
  const match = new RegExp(
    "const launcherScript" + platform + " = (`[\\s\\S]*?`);",
  ).exec(source);
  if (!match) throw new Error("Missing launcher template");
  return runInNewContext(match[1]) as string;
}

test.each(["prepareDist.js", "prepareProxy.js"])(
  "%s preserves stdout and stderr in matching per-service logs",
  (file) => {
    const windows = launcher(file, "Windows");
    const unix = launcher(file, "LinuxMac");
    expect(windows).toContain("if not exist var\\log mkdir var\\log");
    expect(unix).toContain("mkdir -p var/log");
    expect(unix).toContain('cd -- "$(dirname "$0")"');
    for (const name of ["DwarfiumProxy.log", "mediamtx.log"]) {
      expect(windows).toContain(`>> var\\log\\${name} 2>&1`);
      expect(unix).toContain(`>> var/log/${name} 2>&1`);
    }
    if (file === "prepareDist.js") {
      expect(windows).toContain(
        "python -u start_dwarfium.py >> var\\log\\server.log 2>&1",
      );
      expect(unix).toContain(
        "python3 -u start_dwarfium.py >> var/log/server.log 2>&1",
      );
    }
  },
);

(process.platform === "win32" ? test : test.skip)(
  "Windows launcher redirection appends both streams from a folder containing spaces",
  () => {
    const root = mkdtempSync(join(tmpdir(), "Dwarfium log test "));
    const logs = join(root, "var", "log");
    mkdirSync(logs, { recursive: true });
    const fixture = join(root, "emit output.cjs");
    writeFileSync(
      fixture,
      'console.log("stdout marker"); console.error("stderr marker");',
    );
    const written = new Set<string>();
    try {
      for (const file of ["prepareDist.js", "prepareProxy.js"]) {
        const commands = Array.from(
          launcher(file, "Windows").matchAll(
            /^\s*start "" \/Min cmd \/c "(.+)"$/gm,
          ),
        );
        expect(commands.length).toBeGreaterThanOrEqual(3);
        for (const [, command] of commands) {
          const target = />> var\\log\\([^ ]+) 2>&1/.exec(command)![1];
          const executable =
            /^(DwarfiumProxy\.exe|mediamtx\.exe|python -u start_dwarfium\.py)/;
          const simulated = command.replace(
            executable,
            `"${process.execPath}" "${fixture}"`,
          );
          execSync(simulated, { cwd: root, windowsHide: true, stdio: "pipe" });
          written.add(target);
        }
      }
      for (const name of Array.from(written)) {
        const data = readFileSync(join(logs, name), "utf8");
        const count = data.split("stdout marker").length - 1;
        expect(count).toBeGreaterThan(0);
        expect(data.split("stderr marker").length - 1).toBe(count);
        if (name === "DwarfiumProxy.log") expect(count).toBe(2);
        if (name === "mediamtx.log") expect(count).toBe(4);
      }
    } finally {
      for (const name of Array.from(written)) unlinkSync(join(logs, name));
      unlinkSync(fixture);
      rmdirSync(logs);
      rmdirSync(join(root, "var"));
      rmdirSync(root);
    }
  },
);
