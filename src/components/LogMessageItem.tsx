import { statusCodes, apiCodes } from "../../data/dwarfii_codes";
import styles from "@/styles/logs.module.css";

type LogRecord = Record<string, unknown>;

function asRecord(value: unknown): LogRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as LogRecord)
    : {};
}

function label(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function codeLabel(code: unknown, labels: Record<string, string>) {
  return typeof code === "string" || typeof code === "number"
    ? labels[String(code)]
    : undefined;
}

export default function LogMessageItem({
  message,
  sequence,
}: {
  message: unknown;
  sequence: number;
}) {
  const record = asRecord(message);
  const data = asRecord(record.data);
  const command = record.cmd ?? data.cmd;
  const result = data.code ?? record.code;
  const title =
    label(data.cmdPlainTxt) ??
    codeLabel(command, apiCodes) ??
    label(data.cmdText) ??
    label(record.message) ??
    "Device message";
  const description =
    label(data.statePlainTxt) ??
    codeLabel(result, statusCodes) ??
    label(record.description);
  const payload = JSON.stringify(message, null, 2) ?? String(message);

  return (
    <details className={styles.entry}>
      <summary className={styles.entrySummary}>
        <span className={styles.sequence}>#{sequence}</span>
        <span className={styles.entryText}>
          <strong>{title}</strong>
          {description && <small>{description}</small>}
        </span>
        {command !== undefined && (
          <span className={styles.command}>CMD {String(command)}</span>
        )}
        <i className="bi bi-chevron-down" aria-hidden="true" />
      </summary>
      <div className={styles.payload}>
        <span>Full device payload</span>
        <pre>{payload}</pre>
      </div>
    </details>
  );
}
