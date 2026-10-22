# Dwarfium UI architecture

## Product structure

The interface is organized around an observing workflow rather than the old
implementation modules:

- Workspace: Dashboard, Camera, Targets, Sessions
- Plan: Scheduler, Mosaic planner, Polar alignment, Sky map
- Conditions: Weather, Clouds, Moon, Astronomy calendar
- Device: Connection, Device status, Logs, Image editor, About

Routes remain unchanged so bookmarks and desktop deep links continue to work.
The existing `/mosaicplannner` spelling is retained for compatibility.

## Shared shell

`Layout` owns the persistent application shell. `Nav` renders the grouped
desktop rail and mobile drawer. `StatusBar` loads saved connection state once
and exposes the most useful telescope telemetry globally. Pages should not
render their own copy of the status bar.

Reusable page conventions live in `dwarfium-ui.css`:

- `dw-page` constrains the working area.
- `PageHeader` provides an eyebrow, title, description, and optional actions.
- `dw-panel` is the standard functional surface.
- `dw-button`, `dw-badge`, and `dw-inline-empty` define common actions and
  states.
- `dw-setup-section` provides progressive disclosure for long configuration
  flows.

Specialized camera, scheduler, mosaic, WitMotion/MUI, Bootstrap, and legacy
device components remain in place. The shared design layer contains them and
normalizes their visual treatment without changing device protocol behavior.

## Responsive behavior

- Above 860 px, the navigation rail is persistent and can collapse from 248 px
  to 76 px. The preference is saved in local storage.
- At 860 px and below, navigation becomes an off-canvas drawer. The backdrop,
  close button, route changes, and Escape key all close it.
- Dashboard panels move from a 12-column grid to a single column.
- Tables and astronomy calendars scroll within their panel rather than forcing
  page-level horizontal overflow.
- Tauri enforces an 820 × 640 minimum window while the web UI continues down to
  a 320 px viewport.

## Visual and accessibility rules

- Solid surfaces only; no decorative background images.
- Status is communicated with text and iconography in addition to color.
- Controls have visible labels or accessible names and keyboard focus states.
- Empty, disconnected, loading, and unavailable-service states stay inside the
  normal page layout and provide a recovery action.
- Motion is reduced when the operating system requests reduced motion.
- Appearance settings support dark/light console themes, 14–20 px base text,
  and the existing language options.

## Validation

Run the standard checks before merging UI changes:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Browser screenshots and responsive QA artifacts are stored under
`output/playwright/`.
