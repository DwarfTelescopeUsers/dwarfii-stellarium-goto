import styles from "@/components/imaging/AstroSettingsInfo.module.css";

export type AstroCapability = {
  label: string;
  value: string;
};

type PropTypes = {
  modelName: string;
  cameraName: string;
  capabilities: AstroCapability[];
  onClick: () => void;
};

export default function AstroSettingsInfo({
  modelName,
  cameraName,
  capabilities,
  onClick,
}: PropTypes) {
  return (
    <section className={styles.settings} aria-label="Camera capabilities">
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onClick}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
          Settings
        </button>
        <div>
          <span className={styles.eyebrow}>{modelName}</span>
          <h2>{cameraName} capabilities</h2>
        </div>
      </div>

      <dl className={styles.capabilityList}>
        {capabilities.map(({ label, value }) => (
          <div className={styles.capability} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
