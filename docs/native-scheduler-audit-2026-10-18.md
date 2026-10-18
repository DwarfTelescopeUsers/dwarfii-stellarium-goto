# Native scheduler verification, 2026-10-18

Native device schedules use explicit UNIX-second time windows. Local observation
recipes and their desired frame counts are separate; queuing a native task does
not guarantee that frame count or automatically perform EQ setup/dark capture.

APK 3.4.3 evidence confirms the first native sync uses pending-shoot state `1`.
The official app maps its local draft state `0` before sending command `16100`.
The builder now emits state `1`, and native JSON imports normalize new drafts to
that state. Running/completed plans cannot be submitted as new plans. Each task
must last at least 600 seconds, matching the official task editor's minimum.
Exposure/gain fields use the selected live catalogue's values, not UI ordinals.

Submission is tied to the original page/session/generation. Navigating away during
preparation cannot continue into a schedule write. Older overlapping reads cannot
overwrite a newer schedule list. A successful sync acknowledgement is insufficient:
the exact submitted schedule ID must appear in a subsequent device read.

Read-only discovery and bounded owned queries were performed on both devices;
ownership was confirmed and released afterward. Mini firmware 1.1.4 build 4
answered `13:16102` with a type-3 response. DWARF 3 firmware 1.5.3 build 9 did not
answer that query, while ordinary state requests continued to succeed. The full
incoming packet trace did not reveal an alternate schedule response key.
No schedules were created, cancelled or deleted, and no motion/capture commands
were sent for these scheduler probes.

Do not confuse three different version sources:

- HTTP `/getDefaultParamsConfig` reports configuration/protocol version **2.6**
  on both devices. This feeds the official app's `ProtocolVersion` feature gates.
- Incoming WebSocket envelopes report **1.8** on both devices.
- Firmware versions are the separate device build versions above.

The app's scheduler gates require 1.9 for DWARF 3 and 1.7 for other supported
models, using the HTTP configuration version. Both current devices pass those
gates; the DWARF 3 timeout therefore remains a runtime issue, rather than evidence
that its version is below that gate. Do not use an unanswered read as permission
to submit an unverified native job.

Bounded DWARF 3 diagnostic variations also tested request device ID 2 versus 4
and envelope minor version 8 versus 20. None answered the schedule query;
ordinary state requests and ownership release still succeeded. After verifying
idle camera/focus/mount state, an explicitly authorized mode change from Sun
(`8`) to DSO (`2`) was acknowledged and independently confirmed by a snapshot.
The schedule query still timed out in DSO mode. The device was left in DSO mode,
and control was released. No enter-camera, technique, capture or motor command
was part of that diagnostic.

Static APK evidence: `ScheduleDetailVM` sync mapping,
`ScheduleDetailFragment` protocol checks, `ScheduleDetailDialog` task parameter
construction, `ProtocolVersion`, and the task editor's duration validation.
Raw local traces are retained under the workspace's ignored `audit/evidence`
directory; private schedule contents and device addresses are not copied here.

Native timed execution and unattended/fleet scheduling
still need controlled acceptance tests. Successful reads and schema agreement
alone do not certify those operations.

## Controlled Mini queue/cancel acceptance

The main audit subsequently submitted one pending-state `1` Mini job with an
explicit 600-second window beginning 30 minutes in the future. Device readback
confirmed its exact ID as queued. Cancellation immediately removed that ID;
the pre-existing completed schedule history was preserved, and ownership was
released afterward. This verifies native submission/readback/cancellation on
that Mini firmware, not scheduled execution, image acquisition or unattended
reconnection. DWARF 3 native scheduling remains unverified because its list query
does not answer.

## DSO capture mode correction

Both devices' live supported-mode catalogues identify `2` as DSO and `8` as Sun.
Ordinary Mini astronomy capture, native mosaic preparation and the generic
shooting-mode packet default now request and require DSO mode `2`. Explicit solar
packet behavior remains unchanged. Device-reported runtime parameter namespaces
`11` and `13` are separate from this shooting-mode choice and remain supported.

## Firmware empty-list finding and SDK creation API

Targeted Ghidra decompilation of the downloaded D3 1.5.3.9 `magni` binary
(SHA-256 `d878e9590b109d1d970917a6ff737a1864d96139ed7245fcece19890fa684c4a`)
found native handler `0x008e5b60` returns without sending 16102 when its queried
schedule vector is empty. This is consistent with the observed timeout, but a
timeout alone cannot establish an empty queue or a healthy database.

The updated SDK provides explicit `createCurrentTimedSchedule` for fresh jobs:
internally generated cryptographic IDs, one sync request, exact per-ID readback,
and no automatic replacement. A separate Mini test verified that path, followed
by cancellation and confirmation that the test ID was removed and completed
history preserved. The regular application list/import path remains guarded;
it does not automatically fall back from a timed-out read into a write.

D3 became unreachable over HTTP before the new creation path or corrected DSO
capture could receive further physical acceptance. Its last confirmed mode was
DSO 2 and ownership had been released. The SDK usage and remaining limits are
documented in the sibling SDK's `docs/native-schedules.md`.
