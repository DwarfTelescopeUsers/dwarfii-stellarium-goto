import type { MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useState, useContext } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";

import Nav from "@/components/shared/Nav";
import Footer from "@/components/shared/Footer";
import Themesettings from "@/components/shared/Themesettings";
import StatusBar from "@/components/shared/StatusBar";
import { useRouter } from "next/router";
import FleetStatusBar from "@/components/fleet/FleetStatusBar";

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = useRouter().pathname;
  const { deviceError, setDeviceError } = useContext(ConnectionContext);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("dwarfium-sidebar-collapsed") === "true");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      localStorage.setItem("dwarfium-sidebar-collapsed", String(!current));
      return !current;
    });
  };

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const navigateFromSkyAtlas = (event: MouseEvent<HTMLDivElement>) => {
    if (
      pathname !== "/skymap" ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    )
      return;
    const link = event.target.closest("a[href]") as HTMLAnchorElement | null;
    if (
      !link ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self")
    )
      return;
    const destination = new URL(link.href);
    if (
      destination.origin !== window.location.origin ||
      destination.pathname === window.location.pathname
    )
      return;
    // Aladin's static-export teardown needs a document navigation. Fleet
    // monitoring reconnects on the new document without claiming control.
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(destination.href);
  };

  return (
    <div
      className={`dw-app ${collapsed ? "has-collapsed-sidebar" : ""}`}
      onClickCapture={navigateFromSkyAtlas}
    >
      <a className="dw-skip-link" href="#main-content">
        Skip to main content
      </a>
      <Nav
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapsedChange={toggleCollapsed}
        onMobileClose={closeMobile}
      />
      <div className="dw-app-column">
        <header className="dw-mobile-header">
          <button
            type="button"
            className="dw-icon-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <i className="bi bi-list" aria-hidden="true" />
          </button>
          <span>Dwarfium</span>
          <span className="dw-mobile-header-spacer" aria-hidden="true" />
        </header>
        <FleetStatusBar />
        {pathname === "/setup-scope" && <StatusBar />}
        <main id="main-content" className="dw-main" tabIndex={-1}>
          {pathname === "/setup-scope" && deviceError && (
            <div
              role="alert"
              className="alert alert-warning d-flex align-items-center justify-content-between gap-3 m-3"
              style={{ fontSize: "0.875rem" }}
            >
              <span>{deviceError}</span>
              <button
                type="button"
                className="btn-close"
                aria-label="Dismiss device error"
                onClick={() => setDeviceError?.(undefined)}
              />
            </div>
          )}
          {children}
        </main>
        <Footer />
      </div>
      <Themesettings />
    </div>
  );
}
