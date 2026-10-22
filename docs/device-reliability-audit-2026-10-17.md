# Device reliability audit — 2026-10-17

The requested baseline is `df43073f7d3f1aaf852def05efeea867a02650f0`.
The main checkout was restored to that commit before these changes; the removed
commit remains on `backup/pre-audit-2026-10-17`. The audited snapshot is integrated
into dwarfium's `apiV2` and the SDK's `develop`, preserving their remote history.

This audit improved concrete defects and exercised the available Mini and
DWARF 3. It does **not** certify every operation, firmware, observing condition,
or DWARF 2. A successful acknowledgement is not physical completion.

## Implemented corrections

| Area | Result |
| --- | --- |
| SDK parameter identity | Camera ID uses bits 44–47, not bits 8–15. Unknown bits are preserved. HTTP catalog parsing retains uint64 IDs exactly. |
| SDK catalogs | Full camera/technique controls and advertised count ranges are retained; shared camera-15 controls stay separate. Explicit options take precedence over placeholder ranges. |
| SDK transport | Binary state probes replace text ping. Float/bool echo matching uses exact IDs and wire values. Capture responses retain effective parameters; schedule/mosaic APIs and notifications are exposed. |
| Fleet destination | Actual socket host remains immutable during a connection. Duplicate endpoints, stale responses, delayed discovery, and queued offline mutations are rejected. Disconnect cancels pending ownership intent. |
| Selection | Connecting, losing, or reconnecting a selected device never silently selects another connected telescope. The selected offline workspace remains blocked. |
| Capture | Fleet and selected-device controls share a physical-client transaction lock. Settings and runtime namespaces are validated/reapplied; frame progress triggers stop, and completion waits for actual idle/stopped state. |
| Delayed work | Preview, calibration, and GOTO preparation stop on page/device/generation changes. A newer capture also invalidates older same-connection restoration timers. Old cleanup cannot unlock a replacement capture. |
| Preview | Per-device MediaMTX paths, source readback, concurrent creation handling, and per-camera firmware-reported JPEG/RTSP selection replace fixed shared paths and model guesses. Go Live is explicit and requires idle state. |
| Scheduling | Device list/export/import/cancel and first-party timed submission validate actual model/MAC, coordinates, future time windows, catalog values, control, connection identity, and readback. Existing conflicting jobs are never silently replaced. |
| Mosaic | Native scale/filter/exposure/gain/mosaic-count controls are separate from geometry export. They use discovered parameter IDs and physical lifecycle/progress, sharing the capture lock. |
| Photo controls | Burst/time-lapse settings come from the live mode-1 catalog. Media UI follows notifications. Joysticks own one lifecycle, reject stale callbacks, and stop on release/disposal. |

The Git SDK dependency is pinned to published revision
`04da67885c936149279f3cf06bc84d6d6eeeaf2d`. The temporary installation overlay
has been removed; Git installs include the audited runtime and declarations.

## Evidence and verification

| Check | Mini | DWARF 3 |
| --- | --- | --- |
| HTTP identity and astronomy/photo catalogs | Passed | Passed |
| Concurrent read-only WebSocket polling | Passed | Passed |
| Intentional Mini connection loss | Reconnected without command replay | Peer socket and state stayed intact |
| Single short telephoto capture | One actual frame; stopped confirmed | One actual frame; stopped confirmed |
| Concurrent repeat capture | One frame; independent stop/cleanup | One frame; independent stop/cleanup |
| Telephoto live media | Complete MJPEG frame received | HLS stream available |
| Wide live media | HLS stream available | HLS stream available |
| Native schedule read | Historical app-created schedule decoded | Timed out in observer and owned sessions |

Capture checks used one second on Mini and a requested 0.001 seconds on D3,
with no motor/focus commands. Mini reported its one-second applied duration.
Both devices emitted `CODE_ASTRO_NEED_GOTO` alongside actual shooting lifecycle
and one-frame progress. These tests establish bounded capture/control behavior;
they do not establish solved tracking, star quality, or FITS retrieval.
All test ownership locks were explicitly released after their checks.
The capture/preview checks changed camera mode, exposure, gain and frame count;
they did not restore the previous imaging recipe. Select the intended settings
before the next observing session. No motor/focus command or media deletion was
part of these physical checks.

REA inspected the supplied DWARFLAB 3.4.1 base APK without executing it:

- Artifact SHA-256: `1e4f676a35ebe6f9d8cb7b3fb4720346c45c41fc41b7e7807151b0080c5de294`.
- Package identity: `ev_4c5ff80f43946e1042ad5b3fe50cb9f59b55da7b69c17cc2e659ed21454a8f94`.
- Mosaic request serialization: `ev_9a9516728a2d28f2efb886c6792a06e9e04e9a70caf4113f78099e7dd64d7815`.
- Schedule sync serialization: `ev_b8495d339f18ab89806ffabdb667e947c0688c836cba29ddfd0f2ef0b1202b93`.

The adjacent DwarfAlpa research and canonical protobuf definitions supply the
remaining protocol evidence. Artifact/registry presence is static evidence,
not model-specific runtime certification. Original artifacts, decompiler
output, and raw discovery responses remain local; discovery includes private
network settings and is not copied into this report or source fixtures.

Validation completed during integration:

- SDK full tests, TypeScript build and focused lint passed; both actual catalog
  captures resolve telephoto/wide controls offline.
- Dwarfium full CI passed: lint, formatting, TypeScript, **55 suites / 372 tests**.
- Additional selected-device regression and final focused checks passed.
- Production static export, server build, Windows proxy/certificate packaging,
  and desktop tool copy passed.
- Production browser checks exercised real Fleet connections and capability
  discovery. Detailed local logs and evidence are in the workspace's `audit/`.

## Remaining release gates

1. Native timed-job execution and native mosaics need attended sky/motion tests,
   including cancellation, reconnect during execution, and resulting media.
   No schedule or mosaic was submitted to hardware during this audit.
2. D3 native schedule reads timed out even with control after successful capture
   and Go Live. The application reports failure and blocks blind submission;
   the required firmware-specific behavior remains unresolved.
3. Native schedules are time-window jobs. Frame-count plans are not promised as
   exact frame quotas. Automatic EQ preparation and dark-frame recipes are
   explicitly rejected by this submission path.
4. Panorama grid configuration still lacks a verified current mapping. It is
   visibly unavailable rather than sending legacy settings or claiming success.
5. Burst/time-lapse, BLE provisioning, long observing sessions, motion/focus/EQ,
   media retrieval, and Tauri UI/runtime need their own physical acceptance.
6. No DWARF 2 was available. Its current profile has automated coverage only.
   More firmware versions, long network-loss soaks, and multi-tab ownership
   contention remain additional acceptance work.
