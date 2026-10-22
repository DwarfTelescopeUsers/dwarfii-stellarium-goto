# Current DWARF protocol migration audit

Status: migration in progress. The user authorized separate SDK/app commits and pushes on 2026-09-08, and made a DWARF 3 available for connection testing. The latest live-test scope is read-only; no capture, focus or mount movement is authorized by this checkpoint. Earlier authorization/dependency notes below are historical.

Publication checkpoint: the reviewed SDK was committed and pushed to `acocalypso/dwarfii_api`, `develop`, commit `27f14f2b433c520f746345dd969ac9062cbcbacc`. Dwarfium now references that exact Git commit in both package.json and its lockfile; there is no `file:` dependency. Clean-install and final application validation are being repeated against the downloaded Git package before the application commit. `scripts/probe-dwarf-readonly.mjs` provides a separate, explicitly invoked diagnostic with a transport allowlist permitting only the device-state read and ping/pong; it cannot acquire ownership or start operations.

## Git dependency validation and first DWARF 3 live result

After downloading the published Git commit, `npm ci --ignore-scripts` passed (1,028 packages installed; three moderate advisories reported). `npm run CI` passed lint, formatting, TypeScript and 21 suites / 190 tests. `npm run build` passed the production export, proxy packaging and tools copy. The existing static-export/API-route and dynamic `require('mod')` packaging warnings remain; neither was suppressed. The API dependency is now reproducible from Git, unlike the historical local-candidate checkpoints below.

The user then explicitly authorized focus, capture and a daylight GOTO test. Before those operations, a safe Sun-avoiding target/direction and unobstructed movement path were requested; this safety clarification is still pending. No operational test should run until it is answered.

Read-only DWARF 3 test at **2026-09-08 11:37:55 UTC**:

| Check | Observed result | Evidence status |
|---|---|---|
| HTTP identity | DWARF 3, hardware ID 2 | VERIFIED LIVE |
| Session envelope | Wire device ID 4, protocol 1.20 | VERIFIED LIVE for this connection |
| Device-state command | Exactly one outgoing request: module 14, command 16405 | VERIFIED LIVE; send allowlist enforced |
| Protocol readiness | Reached ready from the successful snapshot; observed for 15 seconds | VERIFIED LIVE |
| Battery | 63% | VERIFIED LIVE |
| System / telephoto CMOS temperature | 31°C / 31°C | VERIFIED LIVE |
| Storage | `availableSize:79`, `totalSize:104`, `isValid:true`; raw firmware values, units not inferred in this report | VERIFIED LIVE |
| Notifications observed | 15202, 15243, 15261, 15292 and 16405 response | VERIFIED LIVE |
| Shooting mode | 0 | VERIFIED LIVE |
| Ownership / focus / capture / GOTO | Not tested in this read-only run | NOT VERIFIED |

This does not certify the full DWARF 3 feature set or complete the legacy migration. Remaining workflows and unknowns below remain open. No BLE attempt was needed for this IP-based test.

## Latest checkpoint — user-provided SDK clone (2026-09-08)

The user provided `dwarfium/dwarfii_api`, a clean `develop` checkout at `cc4c3c50a8956e378735a1449aa1bd5376359bad`, and authorized necessary library changes after checking them against the research. `/dwarfii_api/` is now excluded in the app's `.gitignore`; it remains an independent Git repository. The reviewed source/configuration/tests were brought into that clone, and its codecs were regenerated from exact pinned research blobs rather than hand-patched. All 17 schema checksums match the research commit. See its `CURRENT_PROTOCOL_AUDIT.md` for the evidence and executed validation. SDK build, tests and schema audit all passed there.

The app's Git dependency declaration and lock remain unchanged. Earlier local tarball experiments are not the delivery approach. New SDK exports still require a reviewed remote commit before the app can be clean-installed from that Git pin. The earlier commit/push request and the subsequent API-scope clarification must be considered together before publication; no remote mutation has been made in this checkpoint.

Latest application validation: `npm run CI` exited successfully with lint, formatting, TypeScript and **21 suites / 190 tests passed**, using the installed development SDK. No hardware actions were performed.

The app production build passed with the locally installed development SDK (Next 16.3.3), including proxy packaging and tool copies. This is **not** a clean-install pass against the original remote SDK commit. Adding the nested clone exposed a Next/SWC resolution collision: bare SDK imports were rewritten to the root checkout. A narrow TypeScript mapping selects the installed `node_modules/dwarfii_api` package, and Jest/TypeScript exclude the nested repository. The mapping does not change package.json or vendor an SDK; revisit it if the SDK adds package exports. This deviation from normal bare-package lookup is covered by a resolution regression test. Context7 TypeScript paths guidance and installed Next/Jest/transpilation documentation were consulted.

Mount notification corrections are now in progress: one-click phases use canonical oneof names, EQ progress uses its actual state field, and calibration idle no longer reports a successful solve. Empty/invalid coordinate results are rejected. These changes do not yet complete the broader GOTO/calibration/motor workflow migration.

Dependency policy update (2026-09-08): the user requires the Git URL for `dwarfii_api`; local `file:` package dependencies are not acceptable. The original Git declaration, resolved commit and integrity have been restored in package.json/package-lock.json. Earlier local-candidate packaging notes below describe development experiments only, not the accepted delivery approach. The migrated SDK must be committed and made available through the Git repository before advancing this pin, subject to explicit commit/push authorization. The current node_modules still contains the development SDK candidate; this is not a clean-install validation of the restored Git pin.

## Repository baseline

| Repository | Local location | Branch / HEAD | Initial changes | Remote |
|---|---|---|---|---|
| Dwarfium | `C:/Users/Aco/Desktop/Dev-Tools/dwarfium` | `apiV2` / `b9cb82286af22299a6eef15fe7d118e0d3164126` | Clean | `https://github.com/acocalypso/dwarfium` (origin); `https://github.com/stevejcl/dwarfium.git` (upstream) |
| dwarfii_api | `C:/Users/Aco/Desktop/Dev-Tools/dwarfii_api` | `develop` / `cc4c3c50a8956e378735a1449aa1bd5376359bad` | Clean; cloned for this audit after searching known local development roots | `https://github.com/acocalypso/dwarfii_api.git` |
| dwarfAlp | `C:/Users/Aco/Desktop/Astro-Tools/DwarfAlpa` | `main` / `b5a56f00519a1b76ab36d6e445e1d332216816f6` | Clean | `https://github.com/acocalypso/dwarfAlp.git` |

Dwarfium initially references `github:acocalypso/dwarfii_api#4e7d62e33272a401756b3b3207fed442f3978b8d`, package version 3.0.0. This is distinct from current API checkout HEAD. Dependency changes require evidence, independently passing API validation, and a reproducible distribution.

## Environment additions

- Created the sibling API checkout above (no reference research files modified).
- Ran `npm ci` in that checkout: 183 packages, no reported vulnerabilities; no global installations.
- Read installed Next.js Pages Router, custom App, and Jest guidance before implementation.
- Consulted Context7 `/protobufjs/protobuf.js` for static generation, 64-bit values, and field presence. Canonical `.proto` files must drive generated output; use string conversions for 64-bit identifiers.
- Consulted Context7 `/websockets/ws` for binary frames and cleanup and React 18 documentation for effect cleanup and Strict Mode.

## Baseline results (before implementation)

| Repository | Check | Result |
|---|---|---|
| API | `npm ci` | Passed; 183 packages, zero reported vulnerabilities |
| API | `npm run CI` | Passed: lint, formatting, typecheck |
| API | `npm test` | Passed: 36 existing assertions |
| API | `npm run build` | Passed: proto generation, type generation, package, documentation |
| Dwarfium | `npm run CI` | Passed: lint, formatting, typecheck, 12 suites / 85 tests |
| Dwarfium | `npm run build` | Passed: Next static export, proxy package, tools copy |

The pre-existing proxy packaging warning about dynamic `require('mod')` is not a build failure. Building the API regenerates tracked distribution/documentation output; those generated changes originate in this audit's initially clean clone, not user edits. These baseline passes do **not** demonstrate correct protocol behavior.

## Reconciled findings and implementation plan

Evidence below refers to the recorded dwarfAlp commit, not to fresh hardware validation. VERIFIED means recovered schema/APK or checked capture evidence; HIGH means canonical integration evidence without new hardware verification.

| Area | Existing assumption | Current evidence / decision | Confidence |
|---|---|---|---|
| Envelope | Hardware ID is interchangeable with wire ID; D3 shares D2 client | `device_profile.py` and `tests/test_device_profiles.py`: wire 1/20/device4; distinct DAF2/DAF3/DAF4 clients. Keep hardware ID separate. Old model-compatibility prose conflicts with current profile/tests and must not override them. | HIGH; D3 not hardware-certified |
| Schema | Minimal `DeviceStateInfo` and inferred V3 classes | Canonical `task_center.proto`, `notify.proto`, `param.proto`; recovered descriptor SHA256 `4370a369cb1d151d052efbdaa8fd251658d3ced898dbe264aa01b612fa7aaf24`. Import full graph into isolated generated root, retain old API root solely for compatibility. | VERIFIED |
| Correlation | Command matching without strict pending lifecycle | `dwarf/ws_client.py`: `(module,cmd)` pending key, no sequence field;15223 ownership alternate only. Reject same-key concurrency; invalidate pending requests on disconnect and prevent ambiguous retry after timeout. | HIGH |
| Readiness | Any binary frame or HTTP reachability can set connected |16405 successful, meaningful snapshot establishes protocol readiness; ping/open/HTTP do not. Ownership15223 is separate from transport. | HIGH |
| Camera preview |10050/12036 open and close camera | `camera.proto` and APK wrappers: `ReqSetPreviewQuality.level`. Local preview teardown must not send a fabricated close command. | VERIFIED |
| Camera mode |16402 query;16403 shooting mode;16404 generic switch | `task_center.proto`: switch mode, switch technique, enter camera (`client_param` field3). Capture flow uses astronomy mode8, camera enter, deep-sky technique2. | VERIFIED |
| Camera parameters | Generic numeric IDs, index-only cache, old feature setters | `param.proto`: uint64 ID, mode and value; HTTP catalog supplies legal values. Preserve namespaces and 64-bit precision; clear on reconnect/device change. | VERIFIED |
| Capture |11041 arbitrary settings; start ACK means exposure started | `astro.proto`:11041 selects quickset `info_id`;11005 carries filter and force flag.15208/15209/15288 report state/progress/exposure duration. | VERIFIED |
| Focus |15011 initializes or moves to infinity | `focus.proto`: reads saved infinity position; do not label as movement.15004 astro autofocus,15278/15280 completion state. | VERIFIED |
| GOTO units | Same RA convention for all commands; reverse longitude | Canonical session:11002 RA degrees;11013 RA hours. Site longitude east-positive in both GOTO and EQ. Centralize conversions. | HIGH |
| EQ / calibration | Stale EQ state shape, ACK or idle means solved | `notify.proto`:15239 state field1;15256 solved azi/alt. Canonical session waits for solved coordinates, not just ACK. | VERIFIED |
| Notifications |15261 generic device state;15296 observation completion |15261 task-state graph;15296 sky-target-finder.15264 parameter namespace;15267 transition state/source/destination;15292 optional CMOS temperature. | VERIFIED |
| Unknowns | Inferred provisional fields treated as facts |15255 remains capture-derived/provisional; preserve unknown packet diagnostics, never use it alone as completion evidence. | UNKNOWN |

Migration order: (1) reconcile and generate shared canonical SDK surface with goldens; (2) validate the API independently; (3) install a reproducible reviewed local candidate distribution without committing/publishing; (4) replace application wire-format workarounds and legacy command use through the service boundary; (5) reconcile authoritative state, reconnect, model capabilities and UI operation feedback; (6) run contract/model/regression/build checks; (7) stop at the fresh hardware authorization gate. The existing remote dependency pin will not be advanced to a nonexistent commit. A local candidate is not a published stable release.

## Execution boundary

## Implementation checkpoint — 2026-09-07

The migration is in progress, **not ready for hardware authorization or release**.

Implemented in the shared SDK: canonical isolated protobuf generation with source hashes/notices, schema comparison, model profiles, strict packet validation, request correlation, authoritative session state, bounded reconnect, lossless HTTP catalogs and the current astro capture transaction. Its full build (including lint, formatting, TypeScript, generation and JSDoc) exited successfully. `npm test` also passed on this date, including schema, session, catalog, WebSocket and 16 capture tests. These are offline tests, not hardware findings.

Implemented in Dwarfium: the current-session transport boundary, runtime identity/camera catalogs, canonical telemetry, readiness/ownership separation, preview entry, astro capture/focus integration, and camera-setting writes validated against advertised IDs/options. Reconnection during catalog loading cancels pending writes. A socket-scoped guard prevents capture submissions from interleaving even through different callers. Missing settings now produce visible errors instead of invented legacy feature packets.

The photo/video helpers now use named SDK operations. The camera UI follows canonical PhotoState/RecordState notifications and full-snapshot state, including already-running video, instead of treating an ACK or a two-second timer as completion. Telephoto/wide selection and proto3 defaults are covered by tests. Burst, timelapse and panorama are still separate unfinished workflows; this does not certify the entire camera menu.

App tests: 19 suites / 179 tests passed. The earlier checkpoint with 18 suites / 164 tests passed full `npm run CI`. Subsequent production/type checks exposed incomplete types in new media-state test fixtures; the fixtures were corrected and final checks were restarted. See the next validation entry for final results rather than treating this checkpoint as a production-build pass.

### Development dependency warning

The app currently uses a temporary local SDK link created by `npm install --ignore-scripts --no-save --package-lock=false ..\\dwarfii_api`. Its committed dependency declaration and lock still reference the original remote SHA. **A fresh `npm ci` will not reproduce this migration candidate yet.** No remote commit was fabricated and nothing was published. A reviewed immutable dependency artifact/pin and clean-install validation remain required.

That temporary install also refreshed transitive/local packages: the current local Next installation reports 16.3.4 (baseline 16.3.3), React 18.2.0, TypeScript 5.9.3 and Jest 30.5.0, under Node 24.13.1. It reported three moderate advisories. These local install changes are not an approved broad dependency modernization; reconcile them against the lockfile before final validation. The SDK added repository-local `typescript-eslint` 8.69.0 for the new TypeScript surface; no global tools were added.

### Additional documentation validation

| Library | Local version | Context7 reference | Finding applied |
|---|---|---|---|
| Jest | 30.5.0 | `/websites/jestjs_io_30_0` | Await async assertions; mocked rejection/resolution tests must finish before test completion |
| React | 18.2.0 | `/reactjs/react.dev` | External subscriptions return unsubscribe cleanup; dependencies replace subscriptions; Strict Mode repeats setup/cleanup |

DWARF semantics in these changes were checked against the local research `camera.proto`, `notify.proto`, `task_center.proto` and shared command registry, not Context7. PhotoState/RecordState camera identity and operation-state fields are VERIFIED from schemas; application integration is AUTOMATED ONLY, not live verified on either model.

### Remaining work before the automated gate

- Complete GOTO/calibration/EQ/tracking/motor workflows and notification semantics; retain explicit UNKNOWN status for unsupported motor presets.
- Migrate burst/timelapse/panorama, remaining UI-owned packet construction, and the packaged Bluetooth helper/archive. Updating the npm package alone does not migrate the bundled helper.
- Complete dynamic camera-control forms, runtime capture namespace handling and lifecycle/state hydration review. Current advertised-value validation may reject old static form defaults; those forms are not yet fully migrated.
- Replace the temporary SDK link with a reproducible candidate and repeat clean-install validation.
- Review distribution licensing: canonical imported research files carry GPLv3 notices, whereas existing SDK/app root licenses are ISC/MIT. Notices and provenance were preserved; do not describe imported source as ISC or claim redistribution clearance.
- Reconcile all residual occurrences and update the feature/evidence matrices. `docs/protocol-usage-inventory.md` remains the baseline; `docs/protocol-residual-inventory.md` is an intermediate working-tree scan using the same baseline classification rules, **not** a completed classification of the new implementation.
- Finish full production validation and diff review before requesting fresh Mini authorization. No telescope, app auto-connection, focus or mount operation was used during this checkpoint. No commit or push was performed.

Complete the inventory, evidence reconciliation, implementation, and automated validation before asking for fresh Mini hardware authorization. Separate authorization is required for camera/capture, focus, and mount movement. Existing observations from earlier sessions are historical and do not constitute this migration's live verification.
