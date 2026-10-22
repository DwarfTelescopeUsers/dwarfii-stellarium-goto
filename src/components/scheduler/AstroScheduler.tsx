import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { ConnectionContext } from "@/stores/ConnectionContext";
import DeviceSchedulePanel from "./DeviceSchedulePanel";
import TimedPlanSubmit from "./TimedPlanSubmit";
import {
  PLANNER_SELECTION_KEY,
  isPlannerSkySelection,
  plannerSkySelectionFromQuery,
} from "@/lib/observation_planner_transfer";

type PlannerTab = "overview" | "plans" | "editor" | "preferences";
type ObservationPlan = {
  id: string;
  name: string;
  target: string;
  rightAscension: string;
  declination: string;
  startAt: string;
  exposureSeconds: number;
  frameCount: number;
  gain: number;
  filter: "astro" | "dual-band" | "visible";
  autofocus: boolean;
  eqMode: boolean;
  captureDarks: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type PlannerPreferences = {
  defaultExposureSeconds: number;
  defaultFrameCount: number;
  defaultGain: number;
  setupMinutes: number;
};

const PLANS_KEY = "dwarfium-observation-plans-v1";
const PREFERENCES_KEY = "dwarfium-observation-preferences-v1";
const DEFAULT_PREFERENCES: PlannerPreferences = {
  defaultExposureSeconds: 15,
  defaultFrameCount: 120,
  defaultGain: 80,
  setupMinutes: 20,
};

function blankPlan(preferences: PlannerPreferences): ObservationPlan {
  return {
    id: "",
    name: "",
    target: "",
    rightAscension: "",
    declination: "",
    startAt: "",
    exposureSeconds: preferences.defaultExposureSeconds,
    frameCount: preferences.defaultFrameCount,
    gain: preferences.defaultGain,
    filter: "astro",
    autofocus: true,
    eqMode: true,
    captureDarks: true,
    notes: "",
    createdAt: "",
    updatedAt: "",
  };
}

function durationMinutes(plan: ObservationPlan, setupMinutes = 0) {
  const captureSeconds = plan.exposureSeconds * plan.frameCount;
  const overheadSeconds =
    plan.frameCount * 2 +
    (plan.autofocus ? 120 : 0) +
    (plan.captureDarks ? 180 : 0);
  return Math.max(
    1,
    setupMinutes + Math.ceil((captureSeconds + overheadSeconds) / 60),
  );
}

function displayDate(value: string) {
  if (!value) return "Time not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid time"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AstroScheduler() {
  const router = useRouter();
  const connection = useContext(ConnectionContext);
  const importRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<PlannerTab>("overview");
  const [plans, setPlans] = useState<ObservationPlan[]>([]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [draft, setDraft] = useState(() => blankPlan(DEFAULT_PREFERENCES));
  const [formError, setFormError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!router.isReady || initializedRef.current) return;
    initializedRef.current = true;
    let nextPreferences = DEFAULT_PREFERENCES;
    try {
      const storedPlans = localStorage.getItem(PLANS_KEY);
      if (storedPlans) {
        const parsed = JSON.parse(storedPlans);
        if (Array.isArray(parsed)) setPlans(parsed);
      }
    } catch {
      setNotice(
        "Saved plans could not be read. You can still create a new plan.",
      );
    }
    try {
      const storedPreferences = localStorage.getItem(PREFERENCES_KEY);
      if (storedPreferences) {
        nextPreferences = {
          ...DEFAULT_PREFERENCES,
          ...JSON.parse(storedPreferences),
        };
        setPreferences(nextPreferences);
      }
    } catch {
      setNotice("Planner preferences could not be read. Using defaults.");
    }

    let selection = plannerSkySelectionFromQuery(router.query);
    if (!selection) {
      try {
        const storedSelection = localStorage.getItem(PLANNER_SELECTION_KEY);
        if (storedSelection) {
          const parsed: unknown = JSON.parse(storedSelection);
          if (isPlannerSkySelection(parsed)) selection = parsed;
        }
      } catch {
        localStorage.removeItem(PLANNER_SELECTION_KEY);
      }
    }
    if (selection) {
      setDraft({
        ...blankPlan(nextPreferences),
        target: selection.name === "Map center" ? "" : selection.name,
        rightAscension: selection.rightAscension,
        declination: selection.declination,
      });
      localStorage.removeItem(PLANNER_SELECTION_KEY);
      setActiveTab("editor");
      setNotice(
        `Sky Atlas coordinates added (${selection.fovWidthDegrees.toFixed(2)}° × ${selection.fovHeightDegrees.toFixed(2)}° frame). Name the plan and choose a start time.`,
      );
    } else {
      setDraft(blankPlan(nextPreferences));
    }
    setLoaded(true);
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (loaded) localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  }, [loaded, plans]);

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) =>
        (a.startAt || "9999").localeCompare(b.startAt || "9999"),
      ),
    [plans],
  );
  const upcoming = sortedPlans.filter(
    (plan) => !plan.startAt || new Date(plan.startAt).getTime() >= Date.now(),
  );
  const totalMinutes = plans.reduce(
    (total, plan) => total + durationMinutes(plan, preferences.setupMinutes),
    0,
  );
  const readiness = [
    {
      label: "DWARF connection",
      ready: Boolean(connection.connectionStatus),
      detail: connection.connectionStatus
        ? connection.typeNameDwarf || "Connected"
        : "Connect from the status bar",
    },
    {
      label: "Observing location",
      ready:
        connection.latitude !== undefined && connection.longitude !== undefined,
      detail:
        connection.latitude !== undefined && connection.longitude !== undefined
          ? `${connection.latitude.toFixed(3)}, ${connection.longitude.toFixed(3)}`
          : "Set location on First steps",
    },
    {
      label: "Saved plan",
      ready: plans.length > 0,
      detail: plans.length
        ? `${plans.length} ready to export`
        : "Create your first plan",
    },
  ];

  const clearSkyTransfer = () => {
    if (router.query.from === "sky-atlas") {
      void router.replace("/scheduler", undefined, {
        shallow: true,
        scroll: false,
      });
    }
  };

  const startNewPlan = () => {
    clearSkyTransfer();
    setDraft(blankPlan(preferences));
    setFormError(undefined);
    setActiveTab("editor");
  };

  const editPlan = (plan: ObservationPlan) => {
    clearSkyTransfer();
    setDraft({ ...plan });
    setFormError(undefined);
    setActiveTab("editor");
  };

  const savePlan = (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !draft.name.trim() ||
      !draft.target.trim() ||
      !draft.rightAscension.trim() ||
      !draft.declination.trim() ||
      !draft.startAt
    ) {
      setFormError(
        "Add a plan name, target, coordinates and start time before saving.",
      );
      return;
    }
    if (draft.exposureSeconds <= 0 || draft.frameCount <= 0 || draft.gain < 0) {
      setFormError(
        "Exposure and frame count must be greater than zero, and gain cannot be negative.",
      );
      return;
    }
    const now = new Date().toISOString();
    const saved = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      createdAt: draft.createdAt || now,
      updatedAt: now,
    };
    setPlans((current) =>
      current.some((plan) => plan.id === saved.id)
        ? current.map((plan) => (plan.id === saved.id ? saved : plan))
        : [...current, saved],
    );
    setNotice(`${saved.name} saved.`);
    setFormError(undefined);
    clearSkyTransfer();
    setActiveTab("plans");
  };

  const duplicatePlan = (plan: ObservationPlan) => {
    const now = new Date().toISOString();
    setPlans((current) => [
      ...current,
      {
        ...plan,
        id: crypto.randomUUID(),
        name: `${plan.name} copy`,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setNotice("Plan duplicated.");
  };

  const deletePlan = (plan: ObservationPlan) => {
    if (!window.confirm(`Delete “${plan.name}”?`)) return;
    setPlans((current) => current.filter((item) => item.id !== plan.id));
    setNotice("Plan deleted.");
  };

  const importPlans = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed.plans
          ? parsed.plans
          : [parsed];
      if (
        !candidates.every(
          (plan: Partial<ObservationPlan>) => plan.name && plan.target,
        )
      )
        throw new Error();
      const now = new Date().toISOString();
      const imported = candidates.map((plan: Partial<ObservationPlan>) => ({
        ...blankPlan(preferences),
        ...plan,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      }));
      setPlans((current) => [...current, ...imported]);
      setNotice(
        `${imported.length} plan${imported.length === 1 ? "" : "s"} imported.`,
      );
    } catch {
      setNotice("That file is not a valid Dwarfium observation plan.");
    }
  };

  const savePreferences = (event: React.FormEvent) => {
    event.preventDefault();
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    setNotice("Planner defaults saved.");
  };

  const tabs: { id: PlannerTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "bi-grid" },
    { id: "plans", label: "Plans", icon: "bi-calendar3" },
    {
      id: "editor",
      label: draft.id ? "Edit plan" : "New plan",
      icon: "bi-plus-circle",
    },
    { id: "preferences", label: "Preferences", icon: "bi-sliders" },
  ];

  if (!loaded) {
    return (
      <div className="dw-inline-empty" role="status">
        Opening observation planner…
      </div>
    );
  }

  return (
    <div className="dw-planner">
      <DeviceSchedulePanel />
      <nav
        className="dw-planner-tabs"
        aria-label="Observation planner sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "is-active" : ""}
            onClick={() => {
              clearSkyTransfer();
              setActiveTab(tab.id);
            }}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            <i className={`bi ${tab.icon}`} aria-hidden="true" /> {tab.label}
          </button>
        ))}
      </nav>

      {notice && (
        <div className="dw-inline-message" role="status">
          {notice}
          <button
            onClick={() => setNotice(undefined)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {activeTab === "overview" && (
        <div className="dw-planner-view">
          <div className="dw-planner-hero">
            <div>
              <p className="dw-eyebrow">Next clear night</p>
              <h2>Prepare the session before you go outside.</h2>
              <p>
                Plans are stored on this device and exported as portable JSON
                files. No simulated device or scheduler state is shown.
              </p>
            </div>
            <button
              className="dw-button dw-button-primary"
              onClick={startNewPlan}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" /> Create plan
            </button>
          </div>
          <div className="dw-stat-grid">
            <article>
              <span>Saved plans</span>
              <strong>{plans.length}</strong>
            </article>
            <article>
              <span>Upcoming</span>
              <strong>{upcoming.length}</strong>
            </article>
            <article>
              <span>Estimated capture</span>
              <strong>
                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
              </strong>
            </article>
          </div>
          <div className="dw-planner-grid">
            <section className="dw-planner-card">
              <div className="dw-panel-heading">
                <div>
                  <p className="dw-eyebrow">Checklist</p>
                  <h3>Planner readiness</h3>
                </div>
              </div>
              <div className="dw-readiness-list">
                {readiness.map((item) => (
                  <div
                    key={item.label}
                    className={item.ready ? "is-ready" : ""}
                  >
                    <i
                      className={`bi ${item.ready ? "bi-check-circle-fill" : "bi-circle"}`}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className="dw-planner-card">
              <div className="dw-panel-heading">
                <div>
                  <p className="dw-eyebrow">Queue</p>
                  <h3>Next observations</h3>
                </div>
                <button
                  className="dw-text-button"
                  onClick={() => setActiveTab("plans")}
                >
                  View all
                </button>
              </div>
              {upcoming.length ? (
                <div className="dw-plan-list is-compact">
                  {upcoming.slice(0, 3).map((plan) => (
                    <button key={plan.id} onClick={() => editPlan(plan)}>
                      <span>
                        <strong>{plan.target}</strong>
                        <small>{displayDate(plan.startAt)}</small>
                      </span>
                      <span>
                        {durationMinutes(plan, preferences.setupMinutes)} min
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="dw-empty-state dw-empty-state-compact">
                  <i
                    className="bi bi-calendar2-plus dw-empty-state-icon"
                    aria-hidden="true"
                  />
                  <h2>Your queue is empty</h2>
                  <p>Create a plan to organize the next imaging session.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {activeTab === "plans" && (
        <div className="dw-planner-view">
          <div className="dw-section-heading">
            <div>
              <p className="dw-eyebrow">Library</p>
              <h2>Observation plans</h2>
              <p>
                Review timing and settings, then export plans for your
                automation workflow.
              </p>
            </div>
            <div className="dw-action-row">
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={importPlans}
              />
              <button
                className="dw-button dw-button-secondary"
                onClick={() => importRef.current?.click()}
              >
                <i className="bi bi-upload" aria-hidden="true" /> Import
              </button>
              {plans.length > 0 && (
                <button
                  className="dw-button dw-button-secondary"
                  onClick={() =>
                    downloadJson("dwarfium-observation-plans.json", {
                      version: 1,
                      plans,
                    })
                  }
                >
                  <i className="bi bi-download" aria-hidden="true" /> Export all
                </button>
              )}
              <button
                className="dw-button dw-button-primary"
                onClick={startNewPlan}
              >
                New plan
              </button>
            </div>
          </div>
          {sortedPlans.length ? (
            <div className="dw-plan-card-grid">
              {sortedPlans.map((plan) => (
                <article className="dw-plan-card" key={plan.id}>
                  <div className="dw-plan-card-top">
                    <div>
                      <span className="dw-badge">{plan.filter}</span>
                      <h3>{plan.name}</h3>
                      <p>{plan.target}</p>
                    </div>
                    <span className="dw-plan-duration">
                      {durationMinutes(plan, preferences.setupMinutes)} min
                    </span>
                  </div>
                  <dl>
                    <div>
                      <dt>Starts</dt>
                      <dd>{displayDate(plan.startAt)}</dd>
                    </div>
                    <div>
                      <dt>Capture</dt>
                      <dd>
                        {plan.frameCount} × {plan.exposureSeconds}s · gain{" "}
                        {plan.gain}
                      </dd>
                    </div>
                    <div>
                      <dt>Coordinates</dt>
                      <dd>
                        {plan.rightAscension} / {plan.declination}
                      </dd>
                    </div>
                    <div>
                      <dt>Device</dt>
                      <dd>{connection.typeNameDwarf || "DWARF"}</dd>
                    </div>
                  </dl>
                  <div className="dw-plan-tags">
                    {plan.eqMode && <span>EQ mode</span>}
                    {plan.autofocus && <span>Autofocus</span>}
                    {plan.captureDarks && <span>Dark frames</span>}
                  </div>
                  <TimedPlanSubmit plan={plan} />
                  <div className="dw-action-row">
                    <button
                      className="dw-button dw-button-primary"
                      onClick={() => editPlan(plan)}
                    >
                      Edit
                    </button>
                    <button
                      className="dw-icon-button"
                      onClick={() =>
                        downloadJson(
                          `${plan.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`,
                          plan,
                        )
                      }
                      aria-label={`Export ${plan.name}`}
                    >
                      <i className="bi bi-download" />
                    </button>
                    <button
                      className="dw-icon-button"
                      onClick={() => duplicatePlan(plan)}
                      aria-label={`Duplicate ${plan.name}`}
                    >
                      <i className="bi bi-copy" />
                    </button>
                    <button
                      className="dw-icon-button is-danger"
                      onClick={() => deletePlan(plan)}
                      aria-label={`Delete ${plan.name}`}
                    >
                      <i className="bi bi-trash3" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="dw-empty-state">
              <i
                className="bi bi-moon-stars dw-empty-state-icon"
                aria-hidden="true"
              />
              <h2>No observation plans yet</h2>
              <p>
                Create a plan with a target, start time and capture settings. It
                will remain available on this device.
              </p>
              <button
                className="dw-button dw-button-primary"
                onClick={startNewPlan}
              >
                Create first plan
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "editor" && (
        <form className="dw-planner-view dw-plan-form" onSubmit={savePlan}>
          <div className="dw-section-heading">
            <div>
              <p className="dw-eyebrow">{draft.id ? "Update" : "Create"}</p>
              <h2>
                {draft.id ? "Edit observation plan" : "New observation plan"}
              </h2>
              <p>
                Coordinates use hours for right ascension and signed degrees for
                declination.
              </p>
            </div>
            <span className="dw-badge">
              {connection.typeNameDwarf || "No device connected"}
            </span>
          </div>
          {formError && (
            <div className="dw-inline-message is-error" role="alert">
              {formError}
            </div>
          )}
          <div className="dw-form-section">
            <div>
              <span>01</span>
              <h3>Target and timing</h3>
              <p>Name the session and define where and when to observe.</p>
            </div>
            <div className="dw-form-grid">
              <label>
                Plan name
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  placeholder="Andromeda first light"
                />
              </label>
              <label>
                Target
                <input
                  value={draft.target}
                  onChange={(event) =>
                    setDraft({ ...draft, target: event.target.value })
                  }
                  placeholder="M31 — Andromeda Galaxy"
                />
              </label>
              <label>
                Right ascension
                <input
                  value={draft.rightAscension}
                  onChange={(event) =>
                    setDraft({ ...draft, rightAscension: event.target.value })
                  }
                  placeholder="00:42:44.3"
                />
              </label>
              <label>
                Declination
                <input
                  value={draft.declination}
                  onChange={(event) =>
                    setDraft({ ...draft, declination: event.target.value })
                  }
                  placeholder="+41:16:09"
                />
              </label>
              <label className="is-wide">
                Local start time
                <input
                  type="datetime-local"
                  value={draft.startAt}
                  onChange={(event) =>
                    setDraft({ ...draft, startAt: event.target.value })
                  }
                />
              </label>
            </div>
          </div>
          <div className="dw-form-section">
            <div>
              <span>02</span>
              <h3>Capture recipe</h3>
              <p>
                Estimated duration includes a small allowance for each frame and
                enabled preparation steps.
              </p>
            </div>
            <div className="dw-form-grid">
              <label>
                Exposure (seconds)
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={draft.exposureSeconds}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      exposureSeconds: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Frame count
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.frameCount}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      frameCount: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Gain
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.gain}
                  onChange={(event) =>
                    setDraft({ ...draft, gain: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                Filter
                <select
                  value={draft.filter}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      filter: event.target.value as ObservationPlan["filter"],
                    })
                  }
                >
                  <option value="astro">Astro</option>
                  <option value="dual-band">Dual-band</option>
                  <option value="visible">Visible</option>
                </select>
              </label>
              <div className="dw-duration-preview is-wide">
                <i className="bi bi-clock-history" aria-hidden="true" />
                <span>
                  <strong>
                    About {durationMinutes(draft, preferences.setupMinutes)}{" "}
                    minutes
                  </strong>
                  <small>
                    {draft.frameCount} light frames ·{" "}
                    {Math.round(
                      (draft.exposureSeconds * draft.frameCount) / 60,
                    )}{" "}
                    minutes exposed
                  </small>
                </span>
              </div>
            </div>
          </div>
          <div className="dw-form-section">
            <div>
              <span>03</span>
              <h3>Preparation</h3>
              <p>Choose the repeatable setup steps this plan requires.</p>
            </div>
            <div className="dw-check-grid">
              <label>
                <input
                  type="checkbox"
                  checked={draft.autofocus}
                  onChange={(event) =>
                    setDraft({ ...draft, autofocus: event.target.checked })
                  }
                />
                <span>
                  <strong>Autofocus</strong>
                  <small>Focus before the capture sequence.</small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.eqMode}
                  onChange={(event) =>
                    setDraft({ ...draft, eqMode: event.target.checked })
                  }
                />
                <span>
                  <strong>EQ mode</strong>
                  <small>Use equatorial tracking after alignment.</small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.captureDarks}
                  onChange={(event) =>
                    setDraft({ ...draft, captureDarks: event.target.checked })
                  }
                />
                <span>
                  <strong>Dark frames</strong>
                  <small>Include a dark-frame calibration step.</small>
                </span>
              </label>
              <label className="is-wide">
                Session notes
                <textarea
                  rows={4}
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft({ ...draft, notes: event.target.value })
                  }
                  placeholder="Moon conditions, framing notes, fallback target…"
                />
              </label>
            </div>
          </div>
          <div className="dw-form-actions">
            <button
              type="button"
              className="dw-button dw-button-secondary"
              onClick={() => {
                clearSkyTransfer();
                setActiveTab(draft.id ? "plans" : "overview");
              }}
            >
              Cancel
            </button>
            <button className="dw-button dw-button-primary" type="submit">
              <i className="bi bi-check2" aria-hidden="true" /> Save plan
            </button>
          </div>
        </form>
      )}

      {activeTab === "preferences" && (
        <form className="dw-planner-view" onSubmit={savePreferences}>
          <div className="dw-section-heading">
            <div>
              <p className="dw-eyebrow">Defaults</p>
              <h2>Planner preferences</h2>
              <p>
                These values prefill new plans. Existing plans remain unchanged.
              </p>
            </div>
          </div>
          <div className="dw-settings-layout">
            <section className="dw-planner-card">
              <h3>Capture defaults</h3>
              <div className="dw-form-grid">
                <label>
                  Exposure (seconds)
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={preferences.defaultExposureSeconds}
                    onChange={(event) =>
                      setPreferences({
                        ...preferences,
                        defaultExposureSeconds: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Frame count
                  <input
                    type="number"
                    min="1"
                    value={preferences.defaultFrameCount}
                    onChange={(event) =>
                      setPreferences({
                        ...preferences,
                        defaultFrameCount: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Gain
                  <input
                    type="number"
                    min="0"
                    value={preferences.defaultGain}
                    onChange={(event) =>
                      setPreferences({
                        ...preferences,
                        defaultGain: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Setup allowance (minutes)
                  <input
                    type="number"
                    min="0"
                    value={preferences.setupMinutes}
                    onChange={(event) =>
                      setPreferences({
                        ...preferences,
                        setupMinutes: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
            </section>
            <aside className="dw-planner-card">
              <p className="dw-eyebrow">Active setup</p>
              <h3>{connection.typeNameDwarf || "DWARF telescope"}</h3>
              <dl className="dw-setup-summary">
                <div>
                  <dt>Connection</dt>
                  <dd>
                    {connection.connectionStatus
                      ? "Connected"
                      : "Not connected"}
                  </dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {connection.latitude !== undefined &&
                    connection.longitude !== undefined
                      ? `${connection.latitude.toFixed(4)}, ${connection.longitude.toFixed(4)}`
                      : "Not configured"}
                  </dd>
                </div>
                <div>
                  <dt>Time zone</dt>
                  <dd>
                    {connection.timezone ||
                      Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </dd>
                </div>
              </dl>
              <p className="dw-muted">
                Connection and observing location are managed centrally so every
                planning and GOTO tool uses the same values.
              </p>
            </aside>
          </div>
          <div className="dw-form-actions">
            <button className="dw-button dw-button-primary" type="submit">
              Save preferences
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
