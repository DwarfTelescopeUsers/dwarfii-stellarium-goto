# Dwarfium V3 migration report

Date: 2026-08-31

## Outcome

Dwarfium now uses the DWARF V3 protocol envelope and supports DWARF II (device
1), DWARF 3 (device 2), and DWARF mini (device 4). Application code accesses the
protocol through the typed boundary in `src/services/dwarf` instead of importing
generated API modules throughout the UI.

The companion `dwarfii_api` package is versioned as 3.0.0 and pinned to the
reviewed immutable commit `4e7d62e33272a401756b3b3207fed442f3978b8d`.

## Protocol migration

| Concern | V3 behavior |
| --- | --- |
| Envelope | Major 1, minor 20 configured before packet construction |
| Identity | DAF2 client UUID for DWARF II/3; DAF4 UUID for DWARF mini |
| Readiness | Command 16405 response, not SD-card telemetry |
| Camera lifecycle | Tele 10050: action 1 opens, 0 closes; wide 12036 is reversed |
| Mount control | One-click DSO 11013 and solar 11014 include location; stop 11015 |
| Calibration | 11000 includes longitude/latitude; 15256 is terminal |
| Focus | V3 focus commands; autofocus completes on 15278/15280 state 3 |
| Stacking | 11005 sends filter/sentinel and force flag; stop 11006 |
| Recovery | 11050 continues recoverable dark-frame errors on capable models |
| Parameters | Compound uint64 IDs; exposure 16700, gain 16701, adjustments 16703 |
| Authority | Mode-2 HTTP catalog plus authoritative 15264 firmware values |
| Streaming | MediaMTX RTSP `ch0/stream0` tele and `ch1/stream0` wide |

Legacy command IDs still present in the V3 firmware contract remain in use
under the V3 envelope. They are not V2 session negotiation paths.

## Error and lifecycle handling

- Unsupported device IDs stop before socket creation.
- Protocol configuration failures surface as `DwarfProtocolError`.
- Timeout and socket-close paths reset persisted connection state.
- Calibration fails explicitly when coordinates are unavailable.
- Recoverable dark-temperature mismatch follows a model-specific strategy.
- Parameter catalog failure does not falsely mark the socket session as failed.

## Dependency and tooling modernization

- Next.js and `eslint-config-next` 16.3.3 with a passing default Turbopack build.
- Dwarfium uses ESLint 9.39.5 flat config. ESLint 10 currently crashes in the
  React plugin bundled by the Next ruleset because that plugin calls the removed
  `context.getFilename()` API.
- `dwarfii_api` uses ESLint 10.9.1 flat config.
- TypeScript 5.9.3, Prettier 3.9.6, Jest/jsdom 30.5.0, Fabric 7.4.0,
  protobufjs 7.6.6, and maintained `@yao-pkg/pkg` 6.22.0.
- Tauri 2.11 with shell, updater, and process plugins. The former global
  allowlist is reduced to the two sidecars, updater, and relaunch permissions.
- Tauri's removed automatic updater dialog is replaced with an explicit
  check/download/install/relaunch flow.
- A tracked `package-lock.json` makes `npm ci` reproducible.
- Both npm dependency trees report zero known vulnerabilities.

Unused direct packages were removed after repository-wide import analysis,
including amCharts, the styled-components MUI engine, browser `fs`/`path` shims,
`intl`, `modules`, `pem`, direct protobufjs, react-helmet, react-router-dom,
direct sharp, and other unused UI helpers.

React 19, MUI 9, and broad date-picker/i18next/joystick major upgrades remain
deferred because they require separate UI regression work and are not required
for the V3, Next 16, or Tauri 2 migrations.

## Validation completed without hardware

- API: full protobuf/declaration/docs build, ESLint, Prettier, TypeScript, and
  36 V3 protocol assertions.
- Dwarfium: ESLint, Prettier, TypeScript, 62 Jest assertions, Next 16 Turbopack
  production build, server packaging, and sidecar copy.
- Packaged Windows proxy starts and returns HTTP 200 from `/health`.
- Tauri capability/config validation, `cargo check`, and integrated Tauri 2
  debug build without installer bundling. Output: `src-tauri/target/debug/Dwarfium.exe`.
- Clean `npm ci` succeeds in both repositories; audits report zero vulnerabilities.

The Node executable packager emits a known static-analysis warning for
Express's optional dynamic view-engine loader (`require(mod)`). No view engine
is registered, and the packaged proxy smoke test succeeds.

## Hardware validation matrix

Run this matrix on each available telescope and record firmware/app versions:

1. Discovery identity plus minor 20, device ID, and client UUID.
2. 16405 ready state, reconnect, and host/slave behavior.
3. Tele/wide preview, photo, video, burst, timelapse, and panorama.
4. Movement, focus initialization/manual focus, and autofocus completion.
5. Calibration through 15256, DSO/solar GOTO, stop, and tracking.
6. Catalog exposure/gain/filter/frame-count values and 15264 substitutions.
7. Stacking, dark-frame recovery, progress, final image, and temperature.
8. RTSP stability and MediaMTX on-demand teardown.
9. Power/RGB/storage/battery telemetry, disconnect, timeout, and retry paths.
