import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

type NavProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapsedChange: () => void;
  onMobileClose: () => void;
};

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { label: string; items: NavItem[] };

const navigation: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/fleet", label: "Fleet", icon: "bi-hdd-stack" },
      { href: "/", label: "Dashboard", icon: "bi-grid-1x2" },
      { href: "/cameras", label: "Camera", icon: "bi-camera-video" },
      { href: "/objects", label: "Targets", icon: "bi-crosshair" },
      { href: "/image-session", label: "Sessions", icon: "bi-images" },
    ],
  },
  {
    label: "Plan",
    items: [
      {
        href: "/scheduler",
        label: "Observation planner",
        icon: "bi-calendar-check",
      },
      {
        href: "/mosaicplannner",
        label: "Mosaic planner",
        icon: "bi-grid-3x3-gap",
      },
      {
        href: "/polar-alignment",
        label: "Polar alignment",
        icon: "bi-compass",
      },
      { href: "/skymap", label: "Sky map", icon: "bi-stars" },
    ],
  },
  {
    label: "Conditions",
    items: [
      { href: "/forecast", label: "Forecast", icon: "bi-cloud-moon" },
      { href: "/astro-calendar", label: "Calendar", icon: "bi-calendar3" },
    ],
  },
  {
    label: "Device",
    items: [
      { href: "/setup-scope", label: "Connection", icon: "bi-router" },
      { href: "/device-status", label: "Device status", icon: "bi-activity" },
      { href: "/logs", label: "Logs", icon: "bi-terminal" },
      { href: "/editor", label: "Image editor", icon: "bi-sliders" },
      { href: "/about", label: "About", icon: "bi-info-circle" },
    ],
  },
];

export default function Nav({
  collapsed,
  mobileOpen,
  onCollapsedChange,
  onMobileClose,
}: NavProps) {
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() =>
    navigation.map((group) => group.label),
  );

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMobileClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, onMobileClose]);

  useEffect(() => {
    onMobileClose();
  }, [router.asPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeLabel = useMemo(
    () =>
      navigation
        .flatMap((group) => group.items)
        .find((item) => item.href === router.pathname)?.label ?? "Dwarfium",
    [router.pathname],
  );

  const toggleGroup = (label: string) => {
    setExpandedGroups((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  };

  return (
    <>
      {mobileOpen && (
        <button
          className="dw-nav-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={`dw-sidebar ${collapsed ? "is-collapsed" : ""} ${
          mobileOpen ? "is-mobile-open" : ""
        }`}
        aria-label="Primary navigation"
      >
        <div className="dw-brand-row">
          <Link href="/" className="dw-brand" aria-label="Dwarfium dashboard">
            <img src="/DWARFLAB_LOGO_Green.png" alt="" />
            <span>Dwarfium</span>
          </Link>
          <button
            type="button"
            className="dw-icon-button dw-mobile-close"
            onClick={onMobileClose}
            aria-label="Close navigation"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <nav className="dw-nav-scroll" aria-label={`${activeLabel} navigation`}>
          {navigation.map((group) => {
            const expanded = collapsed || expandedGroups.includes(group.label);
            return (
              <section className="dw-nav-group" key={group.label}>
                <button
                  type="button"
                  className="dw-nav-group-title"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={expanded}
                >
                  <span>{group.label}</span>
                  <i
                    className={`bi bi-chevron-${expanded ? "down" : "right"}`}
                    aria-hidden="true"
                  />
                </button>
                {expanded && (
                  <ul>
                    {group.items.map((item) => {
                      const active = router.pathname === item.href;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={active ? "is-active" : ""}
                            aria-current={active ? "page" : undefined}
                            title={collapsed ? item.label : undefined}
                          >
                            <i
                              className={`bi ${item.icon}`}
                              aria-hidden="true"
                            />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </nav>

        <div className="dw-sidebar-footer">
          <a
            href="https://github.com/acocalypso/dwarfium"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? "View on GitHub" : undefined}
          >
            <i className="bi bi-github" aria-hidden="true" />
            <span>View on GitHub</span>
          </a>
          <button
            type="button"
            className="dw-collapse-button"
            onClick={onCollapsedChange}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i
              className={`bi bi-chevron-${collapsed ? "right" : "left"}`}
              aria-hidden="true"
            />
            <span>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}
