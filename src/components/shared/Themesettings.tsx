import { useEffect, useState } from "react";

import i18n from "@/i18n";

const languages: Record<string, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
  zhCN: "简体中文",
};

export default function ThemeSettings() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [fontSize, setFontSize] = useState(15);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const storedFontSize = Number(localStorage.getItem("fontSize"));
    const storedLanguage = localStorage.getItem("language");
    if (storedTheme === "light" || storedTheme === "dark")
      setTheme(storedTheme);
    if (storedFontSize >= 14 && storedFontSize <= 20)
      setFontSize(storedFontSize);
    localStorage.removeItem("backgroundImage");
    if (storedLanguage && languages[storedLanguage])
      setLanguage(storedLanguage);
  }, []);

  useEffect(() => {
    document.body.classList.remove("light-theme", "dark-theme");
    document.body.classList.add(`${theme}-theme`);
    document.documentElement.style.setProperty(
      "--dw-user-font-size",
      `${fontSize}px`,
    );
    localStorage.setItem("theme", theme);
    localStorage.setItem("fontSize", String(fontSize));
  }, [fontSize, theme]);

  useEffect(() => {
    localStorage.setItem("language", language);
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        className="cogwheel-button"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open appearance settings"
        aria-expanded={open}
      >
        <i className="bi bi-palette" aria-hidden="true" />
      </button>
      {open && (
        <div
          className="dw-settings-overlay"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <section
            className="dw-settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appearance-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="dw-settings-header">
              <div>
                <p className="dw-eyebrow">Preferences</p>
                <h2 id="appearance-title">Appearance & language</h2>
              </div>
              <button
                type="button"
                className="dw-icon-button"
                onClick={() => setOpen(false)}
                aria-label="Close appearance settings"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </header>

            <div className="dw-settings-section">
              <h3>Color theme</h3>
              <div className="dw-choice-grid">
                {(["dark", "light"] as const).map((value) => (
                  <button
                    type="button"
                    className={theme === value ? "is-selected" : ""}
                    onClick={() => setTheme(value)}
                    key={value}
                  >
                    <i
                      className={`bi bi-${value === "dark" ? "moon-stars" : "sun"}`}
                      aria-hidden="true"
                    />
                    {value === "dark" ? "Dark console" : "Light console"}
                  </button>
                ))}
              </div>
            </div>

            <div className="dw-settings-section">
              <h3>Text size</h3>
              <div className="dw-font-stepper">
                <button
                  type="button"
                  onClick={() => setFontSize((size) => Math.max(14, size - 1))}
                  aria-label="Decrease text size"
                >
                  <i className="bi bi-dash-lg" aria-hidden="true" />
                </button>
                <strong>{fontSize}px</strong>
                <button
                  type="button"
                  onClick={() => setFontSize((size) => Math.min(20, size + 1))}
                  aria-label="Increase text size"
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" />
                </button>
              </div>
            </div>

            <label className="dw-settings-section">
              <h3>Language</h3>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {Object.entries(languages).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>
      )}
    </>
  );
}
