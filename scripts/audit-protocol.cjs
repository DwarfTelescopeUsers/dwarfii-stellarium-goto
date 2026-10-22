// Offline, reproducible pre-migration inventory. Never contacts a telescope.
// Default: tracked HEAD snapshot. --working-tree also includes new source files.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const ts = require("typescript");
const unzipper = require("unzipper");
const root = path.resolve(__dirname, "..");
const workingTree = process.argv.includes("--working-tree");
const git = (...args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
const head = git("rev-parse", "HEAD").trim();
const tracked = git("ls-files", "-z").split("\0").filter(Boolean);
const untracked = workingTree
  ? git("ls-files", "--others", "--exclude-standard", "-z")
      .split("\0")
      .filter(Boolean)
  : [];
const files = [...new Set([...tracked, ...untracked])].sort();
const textExtensions =
  /\.(?:[cm]?js|jsx|tsx?|json|ya?ml|rs|toml|py|proto|html|ini|ps1|bat|sh)$/;
const excluded =
  /(?:package-lock\.json|Cargo\.lock|\.d\.ts$|^src\/fontello\/|^public\/mosaic\/cat_json\/|^data\/(?!dwarfii_codes\.js)|^scripts\/audit-protocol\.cjs$)/;
const isCode = /\.(?:[cm]?js|jsx|tsx?)$/;
const sourceFiles = new Map();
const rows = [];
const manifests = [];
const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");
const read = (file) =>
  workingTree || !tracked.includes(file)
    ? fs.readFileSync(path.join(root, file), "utf8")
    : git("show", `${head}:${file}`);
const parse = (file, text) =>
  ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

// Reviewed implementation groups, not a name-prefix heuristic. Evidence IDs
// resolve in protocol-architecture.md. A valid wire primitive does not certify
// a containing workflow or its asynchronous completion logic.
const reviewed = new Map();
function review(
  symbols,
  classification,
  feature,
  assumption,
  evidence,
  action,
) {
  for (const symbol of symbols.split(/\s+/).filter(Boolean))
    reviewed.set(symbol, {
      classification,
      feature,
      assumption,
      evidence,
      action,
    });
}
review(
  "messageV3CameraTeleOpenCamera messageV3CameraTeleCloseCamera messageV3CameraWideOpenCamera messageV3CameraWideCloseCamera messageV3DeviceConfigModeSwitch messageV3FocusInit",
  "LEGACY V2",
  "camera / focus semantics",
  "Reviewed SDK misnames preview quality, enter-camera or infinity-position read as open/close/switch/init",
  "R2",
  "Replace semantic API; an ACK cannot prove the incorrectly named operation occurred",
);
review(
  "messageCameraTeleSetBrightness messageCameraTeleSetContrast messageCameraTeleSetHue messageCameraTeleSetIRCut messageCameraTeleSetJPGQuality messageCameraTeleSetSaturation messageCameraTeleSetSharpness messageCameraTeleSetWBColorTemp messageCameraTeleSetWBMode messageCameraTeleSetWBScene messageCameraWideSetBrightness messageCameraWideSetContrast messageCameraWideSetExp messageCameraWideSetExpMode messageCameraWideSetGain messageCameraWideSetHue messageCameraWideSetSaturation messageCameraWideSetSharpness messageCameraWideSetWBColorTemp messageCameraWideSetWBMode messageCameraTeleSetFeatureParams",
  "LEGACY V2",
  "camera parameters",
  "Legacy per-property/feature wrappers omit current camera and shooting-mode parameter namespace",
  "R3",
  "Use current catalog and verified parameter/dedicated commands",
);
review(
  "messageCameraTeleGetAllFeatureParams messageCameraTeleGetAllParams messageCameraTeleGetIRCut messageCameraTeleGetSystemWorkingState messageCameraWideGetAllParams messageCameraWideGetExp messageCameraWideGetExpMode messageCameraWideGetGain",
  "LEGACY V2",
  "camera state",
  "Integration expects old flat ISP/feature responses to represent active V3 state",
  "R2,R3",
  "Use canonical 16405 snapshot and current mode-scoped catalog",
);
review(
  "messageStepMotorMotionTo messageStepMotorReset",
  "UNKNOWN",
  "legacy motor",
  "14001/14003 are retained compatibility IDs, not proven current APK capability",
  "R4",
  "Gate unsupported actions; prefer verified motor service primitives",
);
review(
  "messagePanoramaStartGrid messagePanoramaStop messageCameraTeleStartBurst messageCameraTeleStartRecord messageCameraTeleStartTimeLapsePhoto messageCameraTeleStopBurst messageCameraTeleStopRecord messageCameraTeleStopTimeLapsePhoto messageCameraWideStartBurst messageCameraWideStartRecord messageCameraWideStartTimeLapsePhoto messageCameraWideStopBurst messageCameraWideStopRecord messageCameraWideStopTimeLapsePhoto",
  "UNKNOWN",
  "photo / panorama",
  "Registry presence does not prove model support, parameter setup or completion lifecycle",
  "R4,R5",
  "Audit each payload and lifecycle; gate unsupported operations",
);
review(
  "messageCameraTelePhotograph messageCameraWidePhotograph",
  "LEGACY V2",
  "photo payload",
  "Legacy SDK ReqPhoto allows x/y/ratio; canonical firmware ReqPhoto is empty",
  "R2,R5",
  "Use exact current request even when legacy defaults happen to encode empty",
);
review(
  "messageV3AstroExposureSet messageV3AstroGainSet messageV3AstroFrameCountSet messageV3CameraParamSet messageV3CameraParamSetExpGain encodeParamId decodeParamId",
  "COMPATIBILITY ALIAS",
  "64-bit camera parameters",
  "Reviewed ID packing and command numbers are usable; namespace/value authority still needs service validation",
  "R3,R5",
  "Keep uint64 lossless and validate active camera/mode at service boundary",
);
review(
  "messageV3FocusManualContinuStart messageV3FocusManualContinuStop messageV3FocusManualSingleStep messageV3FocusAutoFocusStart messageFocusStopAstroAutoFocus",
  "COMPATIBILITY ALIAS",
  "focus commands",
  "Reviewed 15001/02/03/04/05 wrappers have canonical direction/mode payload",
  "R5",
  "Keep wire semantics under service; await focus state instead of treating ACK as completion",
);
review(
  "messageV3MotorServiceJoystick messageV3MotorServiceJoystickStop messageStepMotorServiceJoystickFixedAngle",
  "COMPATIBILITY ALIAS",
  "joystick",
  "14006/07/08 wrappers use angle/length; canonical schema has no speed field",
  "R2,R5",
  "Validate degree/vector units and stop lifecycle; remove unverified speed schema field",
);
review(
  "messageAstroStartCalibration messageAstroStartEqSolving messageAstroStopEqSolving messageAstroStartWideCaptureLiveStacking messageAstroStopWideCaptureLiveStacking messageV3AstroContinueShooting messageV3AstroGotoDone messageV3AstroStartStacking messageV3AstroStartTracking messageV3AstroStopStacking",
  "UNKNOWN",
  "astro lifecycle",
  "Known command family does not establish arguments, force-start, active namespace or asynchronous outcome",
  "R2,R3,R5",
  "Reconcile exact payload and notification completion before enabling action",
);
review(
  "messageV3FilterWheelSet",
  "MODEL-SPECIFIC",
  "filters",
  "Mini normal filters 1/2 differ from DWARF 3 0/1/2; dark 3 is calibration-only",
  "R3,R6",
  "Use profile/runtime options, not inferred wheel positions",
);
review(
  "messageGetconfig messageWifiSTA analyzePacketBle",
  "LEGACY V2",
  "BLE provisioning",
  "Reviewed SDK BLE schema lacks current client_id fields and silently drops wrapper properties",
  "R5,R7",
  "Regenerate canonical schema; validate service/CRC/identity/error handling",
);
review(
  "messageSystemSetMasterLock",
  "COMPATIBILITY ALIAS",
  "ownership",
  "13004 is set-master; 15223 ownership response may use alternate module key",
  "R1,R5",
  "Negotiate ownership through correlated session, not optimistic flag",
);
review(
  "messageSystemSetTime messageSystemSetTimezone messageRgbPowerCloseRGB messageRgbPowerDown messageRgbPowerOpenRGB messageRgbPowerPowerIndOFF messageRgbPowerPowerIndON messageRgbPowerReboot",
  "UNKNOWN",
  "system / power",
  "Command existence alone does not prove current response mapping or model capability",
  "R5",
  "Audit exact request/response/state; absent error code must not imply success",
);
review(
  "firmwareVersion deviceInfo getDefaultParamsConfig",
  "CURRENT",
  "HTTP endpoint",
  "8082 routes are also used by canonical research HTTP client",
  "R8",
  "Validate HTTP/application errors; reachability is not WebSocket readiness",
);
review(
  "telephotoURL wideangleURL",
  "MODEL-SPECIFIC",
  "preview transport",
  "SDK helpers return 8092 MJPEG; RTSP models need separate MediaMTX paths",
  "R6,R8",
  "Guard by profile; Mini/DWARF 3 cannot use dummy/MJPEG as live fallback",
);

// Static graph from every Next page, including _app. Only the independently
// reviewed retired sensor subtree uses this as dead-code evidence.
const graph = new Map();
for (const file of files) {
  if (!textExtensions.test(file) || excluded.test(file)) continue;
  const text = read(file);
  sourceFiles.set(file, text);
  if (!file.startsWith("src/") || !isCode.test(file)) continue;
  const links = new Set();
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      links.add(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      ["require", "import"].includes(node.expression.getText()) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      links.add(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(parse(file, text));
  graph.set(file, [...links]);
}
const productionReachable = new Set();
function mark(file) {
  if (productionReachable.has(file)) return;
  productionReachable.add(file);
  for (const specifier of graph.get(file) || []) {
    const base = specifier.startsWith("@/")
      ? `src/${specifier.slice(2)}`
      : specifier.startsWith(".")
        ? path.posix.normalize(
            path.posix.join(path.posix.dirname(file), specifier),
          )
        : undefined;
    if (!base) continue;
    const target = [
      base,
      ...[
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        "/index.ts",
        "/index.tsx",
        "/index.js",
      ].map((suffix) => base + suffix),
    ].find((candidate) => graph.has(candidate));
    if (target) mark(target);
  }
}
for (const file of graph.keys()) if (file.startsWith("src/pages/")) mark(file);

function classify(row) {
  const testNote = row.file.includes("__tests__/")
    ? " Test assertion is an evidence consumer, not independent protocol evidence."
    : "";
  const result = (classification, feature, assumption, evidence, action) => ({
    classification,
    feature,
    assumption,
    evidence,
    action: action + testNote,
  });
  if (row.file === "jest.config.mjs")
    return result(
      "CURRENT",
      "test module transformation",
      "The SDK ESM transform exception is test configuration, not a DWARF version",
      "A1",
      "Retain appropriate package transformation when SDK packaging changes",
    );
  if (row.file === "package.json" && /dwarfii_api/.test(row.symbol))
    return result(
      "COMPATIBILITY ALIAS",
      "dependency provenance",
      "Dependency is pinned to an exact fork commit; pinning does not establish schema correctness",
      "A2",
      "Preserve reproducibility; use independently validated SDK artifact after shared fixes",
    );
  if (
    /^public\/mosaic\/(?:aladin|inline)\.js$|^notebooks\/create_catalogues\.py$/.test(
      row.file,
    )
  )
    return result(
      "CURRENT",
      "reviewed non-protocol numeric match",
      "Reviewed match is catalog coordinates/counts or UI z-index, not an encoded command",
      "A1",
      "Leave unrelated astronomy/rendering values unchanged",
    );
  if (row.file.includes("!"))
    return result(
      "LEGACY V2",
      "packaged BLE dependency",
      "Independent legacy SDK/protobuf ships outside package-lock",
      "A9,R7",
      "Replace/rebuild packaged source or explicitly gate direct BLE; artifact presence is not correctness evidence",
    );
  if (
    /^src\/(?:lib|components)\/witmotion\//.test(row.file) &&
    !productionReachable.has(row.file)
  )
    return result(
      "DEAD CODE",
      "retired sensor",
      "No static import path from any Next page or _app",
      "A8",
      "Remove retired subtree after final graph review; no DWARF protocol replacement needed",
    );
  if (
    row.file === "data/dwarfii_codes.js" ||
    row.file.endsWith("/LogMessageItem.tsx")
  )
    return result(
      "LEGACY V2",
      "log names / errors",
      "Renderer imports duplicated old command/error dictionary",
      "A7,R2",
      "Use shared registry; retain unknown numeric codes without guessing descriptions",
    );
  if (/src\/locales\//.test(row.file))
    return result(
      "COMPATIBILITY ALIAS",
      "localized setup copy",
      "Stable DwarfII translation keys are generic; prose still contains historical Bluetooth/host advice",
      "A7",
      "Keep keys as needed; update misleading connection prose",
    );
  if (
    /data_dwarf[23]_config\.ts$/.test(row.file) ||
    /(?:allowedExposures|allowedGains|DwarfModelId|typeIdDwarf|DEFAULT_CLIENT_ID|0000DAF|deviceId|protocolMinorVersion)/.test(
      row.symbol,
    )
  )
    return result(
      "MODEL-SPECIFIC",
      "identity / catalog",
      "Hardware ID, wire identity, camera range and fallback model are distinct concerns",
      "R3,R6",
      "Use verified profile, reject unknown identity, refresh mode/camera-scoped catalog",
    );
  if (
    row.file === "src/hooks/useSetupConnection.ts" &&
    /setConnectionStatus|saveConnectionStatusDB|no-cors|isConnected|setInterval|clearInterval/.test(
      row.symbol,
    )
  )
    return result(
      "LEGACY V2",
      "session lifecycle",
      "HTTP/transport success can set ready; mount closure conditionally cleans timers",
      "A3,R1",
      "Use one session owner with decoded-state/ownership readiness and unconditional cleanup",
    );
  if (/mediamtx|MediaMTX|rtsp:\/\/|8888|9997/.test(row.symbol))
    return result(
      "MODEL-SPECIFIC",
      "MediaMTX transport",
      "HLS/API ports belong to local streaming service, not DWARF envelope version",
      "A5,R8",
      "Keep streaming health separate; configure current device IP before preview request",
    );
  if (/dwarfii-status|ConnectDwarfII/.test(row.symbol))
    return result(
      "COMPATIBILITY ALIAS",
      "route / component",
      "Old route re-exports device-status; ConnectDwarfII is generic shared button",
      "A7",
      "Keep navigation compatibility; do not delete by spelling",
    );
  const symbolic = reviewed.get(row.canonical || row.symbol);
  if (symbolic) return { ...symbolic, action: symbolic.action + testNote };
  if (
    /Dwarfii_Api\.DwarfCMD\.CMD_(?:V3_CAMERA_(?:TELE|WIDE)_OPEN_CAMERA|V3_FOCUS_INIT|V3_DEVICE_CONFIG_MODE_SWITCH)/.test(
      row.symbol,
    )
  )
    return result(
      "LEGACY V2",
      "misnamed command",
      "Alias conflicts with firmware preview-quality/enter-camera/infinity-read semantics",
      "R2",
      "Replace semantic API; keep old names only for documented compatibility consumer",
    );
  if (row.kind === "import/export")
    return result(
      "COMPATIBILITY ALIAS",
      "boundary dependency",
      "Import is not protocol evidence; boundary re-exports raw SDK",
      "A2",
      "Move raw operations behind semantic service; review each actual call",
    );
  if (
    /^(?:WebSocketHandler|configureDwarfProtocol|createV3SessionPackets|createPacket|setDwarfClientID|setDwarfDeviceID|setDwarfMinorVersion)$/.test(
      row.symbol,
    )
  )
    return result(
      "UNKNOWN",
      "envelope / session",
      "Global SDK identity and handler lifecycle need session-level reconciliation",
      "R1,R6,A3",
      "Correlate module+cmd, isolate identity, reject unknown packets as readiness",
    );
  if (
    row.file.endsWith("/telemetry.ts") ||
    /decodeV3DeviceStateTelemetry/.test(row.symbol)
  )
    return result(
      "COMPATIBILITY ALIAS",
      "telemetry workaround",
      "App manually decodes snapshot fields because shared SDK schema is incomplete",
      "A4,R2,R5",
      "Regenerate canonical SDK schema, remove duplicate raw decoder and retain presence tests",
    );
  if (
    /setConnectionStatus|setAstroSettings|setImagingSession|setGoto|setTracking|setFocus|setBattery|setTemperature|setMemory|\.data\.(?:state|code|mode|value|currentCount|totalCount)/.test(
      row.symbol,
    )
  )
    return result(
      "UNKNOWN",
      "state authority",
      "Assignment/branch does not prove which ACK, notification or missing/cached value authorizes state",
      "A4,R1,R2",
      "Trace authoritative notification/snapshot; preserve missing state and clear stale session data",
    );
  return result(
    "UNKNOWN",
    row.kind,
    "Covered occurrence lacks a sufficiently reviewed wire/semantic decision",
    "A10",
    "Reconcile payload, model, units and lifecycle; identifiers alone are not evidence",
  );
}

function scan(file, text) {
  const source = parse(file, text);
  const seen = new Set();
  const apiNames = new Map();
  function add(line, symbol, kind, canonical) {
    const key = `${line}:${symbol}`;
    if (seen.has(key)) return;
    seen.add(key);
    const row = { file, line, symbol: symbol.slice(0, 170), kind, canonical };
    rows.push({ ...row, ...classify(row) });
  }
  const lineOf = (node) =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  if (
    /^src\/(?:lib|components)\/witmotion\//.test(file) &&
    !productionReachable.has(file)
  )
    add(1, "retired sensor module", "reachability");
  if (isCode.test(file)) {
    for (const node of source.statements) {
      if (
        (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) ||
        !node.moduleSpecifier ||
        !/dwarfii_api|services\/dwarf|lib\/(?:connect_utils|dwarf_utils|goto_utils|photo_utils|data_utils|data_wide_utils|get_dwarf_type)|ConnectionContext|dwarfii_codes/.test(
          node.moduleSpecifier.text,
        )
      )
        continue;
      add(lineOf(node), node.moduleSpecifier.text, "import/export");
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings))
        for (const element of bindings.elements)
          apiNames.set(
            element.name.text,
            element.propertyName?.text || element.name.text,
          );
    }
    function visit(node) {
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const name = node.expression.getText(source);
        if (
          apiNames.has(name) ||
          /^(?:message(?:V3|Astro|Camera|Focus|Step|System|Panorama|Wifi|Getconfig|Rgb)|createPacket|analyzePacket|encodeParamId|decodeParamId|createCurrentPacket|decodeCurrentPacket|encodeCurrentMessage|decodeCurrentMessage|assertCurrentSuccess|currentMessageType)/.test(
            name,
          ) ||
          /(?:socket|Socket|connectionCtx)\w*\.(?:prepare|send|start|close|cleanup|set[A-Z]|isConnected)/.test(
            name,
          )
        )
          add(
            lineOf(node),
            name,
            "call / state transition",
            apiNames.get(name),
          );
      }
      if (
        ts.isPropertyAccessExpression(node) &&
        !ts.isPropertyAccessExpression(node.parent)
      ) {
        const name = node.getText(source);
        if (
          /^(?:Dwarfii_Api|CurrentDwarfSchema|CurrentCommands|CurrentNotifications|V3_PARAM_|V3_CAMERA_|V3_SHOOTING_)/.test(
            name,
          ) ||
          /\.data\.(?:state|code|mode|value|currentCount|totalCount)$/.test(
            name,
          )
        )
          add(lineOf(node), name, "protocol constant / state");
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  const suspicious =
    /apiV2|\bV2\b|dwarfii_api|Dwarfii_Api|\b(?:CMD_|MODULE_|WS_MINOR_VERSION|WS_MAJOR_VERSION|TYPE_REQUEST|TYPE_RESPONSE|TYPE_NOTIFY|WsPacket|OperationState)|\bmessage(?:Getconfig|WifiSTA)|(?:create|analyze)_packet_ble|get_wifi_config_message|set_wifi_STA_message|0000DAF|minor_?Version|minor_version|major_version|client_?Id|client_id|device_?Id|device_id|cmd\s*[=:]|module_id|typeIdDwarf|DwarfModelId|allowedExposures|allowedGains|data_dwarf[23]_config|\b(?:1[015234678]\d{3}|9900|8082|8092|8888|9997)\b|rtsp:\/\/|(?:main|second)stream|mediamtx|MediaMTX|setConnectionStatus|saveConnectionStatusDB|no-cors|dwarfii-status|ConnectDwarfII|\.data\.(?:state|code|mode|value)|(?:rawPreviewURL|wideangleURL|telephotoURL)/;
  text.split(/\r?\n/).forEach((line, i) => {
    if (!suspicious.test(line)) return;
    const safe = /(?:password|passwd|api.?key|token)\s*[:=]/i.test(line)
      ? "[credential-bearing line redacted; review source locally]"
      : line.trim();
    add(i + 1, safe, "literal / schema / assumption");
  });
}

async function main() {
  for (const [file, text] of sourceFiles) scan(file, text);
  // Inspect committed BLE source archives without extraction or execution.
  // Generated codecs are fingerprinted; their .proto/wrappers are scanned.
  for (const file of files.filter((name) =>
    /install\/(?:windows|linux)\/extern\/extern\.zip$/.test(name),
  )) {
    const zipBytes = workingTree
      ? fs.readFileSync(path.join(root, file))
      : execFileSync("git", ["show", `${head}:${file}`], {
          cwd: root,
          maxBuffer: 512 * 1024 * 1024,
        });
    manifests.push({
      file,
      kind: "distribution archive",
      sha: hash(zipBytes),
      bytes: zipBytes.length,
    });
    const directory = await unzipper.Open.buffer(zipBytes);
    for (const entry of directory.files) {
      if (
        !/dwarf_ble_connect\//.test(entry.path) ||
        !/\.(?:js|py|proto|html)$/.test(entry.path) ||
        entry.type === "Directory"
      )
        continue;
      const bytes = await entry.buffer();
      const location = `${file}!${entry.path}`;
      if (/\/protobuf\//.test(entry.path)) {
        manifests.push({
          file: location,
          kind: "generated SDK codec; audit .proto instead",
          sha: hash(bytes),
          bytes: bytes.length,
        });
        const row = {
          file: location,
          line: 1,
          symbol: "generated codec artifact",
          kind: "generated artifact",
        };
        rows.push({ ...row, ...classify(row) });
      } else scan(location, bytes.toString("utf8"));
    }
  }
  const counts = {};
  for (const row of rows)
    counts[row.classification] = (counts[row.classification] || 0) + 1;
  const escape = (value) =>
    String(value)
      .replaceAll("|", "\\|")
      .replaceAll("`", "'")
      .replaceAll("\n", " ");
  const output = [
    "# Protocol usage inventory",
    "",
    `Snapshot: ${workingTree ? "working tree based on" : "tracked HEAD"} \`${head}\`. Generated by \`node scripts/audit-protocol.cjs${workingTree ? " --working-tree" : ""}\`. No hardware used.`,
    "",
    "This is the pre-migration audit, not a claim that every operation works. Evidence IDs resolve in [protocol-architecture.md](protocol-architecture.md). CURRENT endpoints and COMPATIBILITY ALIAS primitives do not certify containing workflows. Tests use the same six classifications: an old passing assertion is not independent evidence. UNKNOWN is an explicit unresolved conclusion, never approval.",
    "",
    `Coverage: ${sourceFiles.size} repository text files scanned; ${rows.length} occurrences in ${new Set(rows.map((r) => r.file)).size} source/archive locations. ${Object.entries(
      counts,
    )
      .map(([key, value]) => `${key}: ${value}`)
      .join("; ")}.`,
    "",
    "Search includes imports/exports and aliased calls, numeric commands/module/version/client identities, response/state setters, lookup tables, ports/stream routes, translations, configuration, deployment scripts, Rust, tests, and committed BLE archive source. Asset/catalog data, locks and declaration maps are excluded as non-executable duplicates; generated archive codecs are fingerprinted and their sources scanned. Credentials are redacted. Executable binaries remain opaque and require reproducible rebuilding; archive inspection does not certify them.",
    "",
    "Static reachability starts at every current Next page and _app, following local imports/re-exports/literal dynamic imports. It is used only for the independently reviewed retired witmotion subtree, not as a blanket deletion rule. A line may appear once as an AST operation and once as a literal assumption so neither view hides dependencies.",
    "",
    "| File | Symbol / call | Feature | Classification / legacy assumption | Replacement evidence | Action |",
    "|---|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.file}:${r.line} | ${escape(r.symbol)} | ${r.feature} | ${r.classification} — ${r.assumption} | ${r.evidence} | ${r.action} |`,
    ),
    "",
    "## Distribution provenance",
    "",
    "| Artifact | Kind | Bytes | SHA-256 |",
    "|---|---|---:|---|",
    ...manifests.map(
      (m) => `| ${m.file} | ${m.kind} | ${m.bytes} | ${m.sha} |`,
    ),
    "",
    "## Audit-tool validation",
    "",
    "TypeScript 5.9.3 Compiler API traversal was checked through Context7 (/microsoft/typescript/v5.9.3): createSourceFile, forEachChild, import guards and source line mapping. Context7 had no unzipper entry; Open/buffer access follows the installed unzipper README. No dependencies were added. This tool reads repository/archive bytes only and writes this Markdown report.",
    "",
  ].join("\n");
  const report = workingTree
    ? "docs/protocol-residual-inventory.md"
    : "docs/protocol-usage-inventory.md";
  fs.writeFileSync(path.join(root, report), output);
  console.log(
    `${rows.length} occurrences; ${JSON.stringify(counts)}; ${manifests.length} archive artifacts`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
