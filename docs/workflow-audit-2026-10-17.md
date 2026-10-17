# Observing workflow audit — 17 October 2026

This report describes the isolated audit worktree, based on `df43073`. Hardware
results are recorded separately by the main audit. Passing mocked protocol tests
does not establish successful tracking, stacking, plate solving or image quality
under the sky.

## Corrected capture behavior

- The selected-device capture service now uses the same runtime capture path as
  Fleet. Previously only Fleet used the existing Mini runtime implementation.
- All model families wait for a confirmed capture lifecycle, not just a command
  acknowledgement. Raw frame progress requests stop at the configured boundary;
  stop acknowledgement does not release the transaction before idle/stopped.
- A fresh device snapshot must confirm the relevant camera is idle before
  configuration starts. This also blocks accidental reconfiguration after a
  previous local operation timed out while the physical device remained active.
- DWARF 2/3 retain the SDK quick-set preparation. Mini retains the existing
  manual-setting/readback path. Observed module-15 parameter namespaces 11/13
  trigger a serialized reapplication of the requested exposure, gain and count.
- Reapplication belongs to its original connection and transaction. It cannot
  continue after stop/completion or be transferred to another selected device.
- Fleet and the selected-device page share an astronomy ownership lock keyed by
  the actual SDK client, including native mosaics.
- Camera catalogue normalization now delegates to the corrected SDK instead of
  appending a second copy of technique parameters. The SDK owns the actual
  camera namespace in bits 44–47 and published parameter ranges.

Evidence: `DwarfAlpa/docs/apk-analysis/capture-workflows.md`, the recovered
firmware descriptors, runtime notification schemas, and the live catalogues
recorded by the main audit.

## Native mosaic control

The mosaic page now has a separate native capture panel. The existing planner
continues to calculate/export geometry; its grid is not silently converted into
an active hardware job.

Native capture validates exposure/gain and the dedicated `mosaicCount` parameter
against the selected device's live catalogue, writes and reads back those values,
then submits command 11031 with its exact scale/filter fields. `mosaicCount` is
parameter index 17, distinct from normal `stackCount` index 16. Scale values
100–180 in steps of 10 represent 1.0×–1.8×; rotation -1 follows the official
app's current-target start path. Progress comes from notification 15263. Stop is
11006 and requires the actual capture lifecycle to reach idle/stopped.

The panel does not manufacture a GoTo, focus, alignment or tracking success. The
observer must establish the target in Control first. Availability is based on
the live mosaic parameter; a registry entry alone is insufficient. Native mosaic
completion, panel arrangement, FITS creation and recovery still require sky or
controlled hardware validation on each model/firmware.

Evidence: APK `CaptureViewModel.m13628z7`, `WsStartMosaicReq`,
`MosaicScalePickerView`, `PreviewFrameScaleGear`, canonical `ReqStartMosaic` and
`ProgressCaptureMosaic`, and the live Mini catalogue.

## Native scheduler management

The original scheduler page only saved local plans and exported JSON. It did not
run a queue, send device schedules, or execute preparation flags.

A device panel now reads actual native schedules, exports their exact versioned
app task JSON, imports/submits future native schedules bound to the same host and
hardware model, and cancels known pending/running schedules. It requires control
for mutations and a successful device read. Duplicate IDs, unsupported parameter
versions, cross-device imports, invalid time windows and silent replacement are
rejected. Connection changes invalidate outstanding results. A failed or timed-out
query is shown as unverified state, never an empty verified queue. A mutation ACK
is followed by a fresh schedule read.

Each saved recipe now offers explicit timed-job submission with a required local
end time and the selected device's address. The adapter verifies actual device
model/MAC discovery, successful native scheduler support, exact live catalogue
exposure/gain/filter choices, coordinates, observing location and future UNIX-second
windows. It creates unique version-1 schedule/task IDs and confirms the exact new
ID in the device list after submission. The MAC/model are verified again immediately
before writing. Automatic EQ setup and dark preparation are rejected; autofocus is
serialized through the app's `PlanParam.focusMode` field.

Native tasks use time windows; `count` and `stacked` are progress fields, not a
requested frame quota. Timed submission therefore does not guarantee the local
recipe's frame target. Automatic exact-frame future queues, durable multi-device
orchestration and native scheduler capability on DWARF 2/3 still require further
work and validation. The main audit observed a real Mini native schedule response
and a DWARF 3 scheduler-query timeout. No native schedule was submitted to hardware
as part of this workflow subtask.

Evidence: APK `PlanParam`, `TaskParam`, `TaskDetailVM`, `ScheduleDetailVM`,
`ScheduleStarCreateDialog`; firmware `shooting_schedule.proto`; actual Mini native
schedule response recorded by the main audit. Private device identifiers and
location have not been copied into test fixtures or this report.

## Automated verification

Focused Jest suites cover the device-bound scheduler, native mosaics, Mini/D3
capture lifecycle, runtime namespace reapplication, camera catalogues, Fleet
capture integration and the selected-device capture guard. The audit run passed
38 tests across eight suites. Focused ESLint passed. The last full TypeScript check
had no findings in these workflow changes; unrelated media-configuration edits
were still being resolved by another audit task. Native timed execution and
mosaic panel capture still require controlled hardware/sky acceptance; no such
jobs were started by this workflow subtask.
