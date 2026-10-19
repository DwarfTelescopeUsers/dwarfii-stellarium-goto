import Head from "next/head";
import Link from "next/link";
import type { ReactNode } from "react";
import ConnectDwarfSTA from "@/components/setup/ConnectDwarfSTA";
import FleetConnectionSetup from "@/components/setup/FleetConnectionSetup";
import ConnectStellarium from "@/components/setup/ConnectStellarium";
import SetLocation from "@/components/setup/SetLocation";
import RegisterConfiguredDevice from "@/components/fleet/RegisterConfiguredDevice";
import styles from "@/styles/connection-setup.module.css";

function SetupSection({
  number,
  title,
  description,
  children,
  open = false,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className={styles.section} open={open}>
      <summary>
        <span className={styles.number}>{number}</span>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className={styles.chevron} aria-hidden="true">
          ⌄
        </span>
      </summary>
      <div className={`dw-setup-section-body ${styles.body}`}>{children}</div>
    </details>
  );
}

export default function SetupScope() {
  return (
    <div className={styles.page}>
      <Head>
        <title>Connection setup · Dwarfium</title>
      </Head>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>DEVICE SETUP</span>
          <h1>Connect your telescope</h1>
          <p>Set up a new DWARF or reconnect one already on your network.</p>
        </div>
        <Link href="/fleet/" className={styles.back}>
          ← Fleet overview
        </Link>
      </header>
      <aside className={styles.tip}>
        <i className="bi bi-info-circle" aria-hidden="true" />
        <p>
          For a new telescope, update its firmware in the DWARFLAB app first.
          Already configured? Enter its address in{" "}
          <strong>Connect to DWARF</strong> below.
        </p>
      </aside>
      <div className={styles.stack}>
        <SetupSection
          number="01"
          title="Observing location"
          description="Latitude, longitude and time zone for accurate pointing."
        >
          <SetLocation />
        </SetupSection>
        <SetupSection
          number="02"
          title="Bluetooth & Wi-Fi"
          description="Find a telescope, configure its network or reuse a saved Wi-Fi profile."
        >
          <ConnectDwarfSTA />
        </SetupSection>
        <SetupSection
          number="03"
          title="Connect to DWARF"
          description="Connect using the discovered address or enter an IP address."
          open
        >
          <FleetConnectionSetup />
        </SetupSection>
        <SetupSection
          number="04"
          title="Save to your Fleet"
          description="Give the configured telescope a name and keep it in your overview."
        >
          <RegisterConfiguredDevice />
        </SetupSection>
        <SetupSection
          number="+"
          title="Stellarium"
          description="Optional · connect a planetarium for target selection."
        >
          <ConnectStellarium showInfoTxt={true} />
        </SetupSection>
      </div>
      <p className={styles.footnote}>
        Location is shared by this installation. Wi-Fi profiles stay on this
        browser or app; they are not synced.
      </p>
    </div>
  );
}
