import { useContext, useEffect, useMemo, useState } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";
import { deleteLogMessagesDb, saveLoggerStatusDb } from "@/db/db_utils";
import LogMessageItem from "./LogMessageItem";
import styles from "@/styles/logs.module.css";

const PAGE_SIZE = 50;

export default function LogMessages() {
  const connection = useContext(ConnectionContext);
  useLoadIntialValues();
  const [messages, setMessages] = useState<unknown[]>([]);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setMessages(Array.isArray(connection.logger) ? connection.logger : []);
  }, [connection.logger]);

  useEffect(() => {
    const onStorageUpdate = (event: StorageEvent) => {
      if (event.key !== "logMessages") return;
      try {
        const next = event.newValue ? JSON.parse(event.newValue) : [];
        setMessages(Array.isArray(next) ? next : []);
      } catch {
        setMessages([]);
      }
    };
    window.addEventListener("storage", onStorageUpdate);
    return () => window.removeEventListener("storage", onStorageUpdate);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return messages
      .map((message, index) => ({ message, sequence: index + 1 }))
      .reverse()
      .filter(
        ({ message }) =>
          !needle ||
          String(JSON.stringify(message) ?? message)
            .toLocaleLowerCase()
            .includes(needle),
      );
  }, [messages, query]);

  const toggleLogger = () => {
    const next = !connection.loggerStatus;
    saveLoggerStatusDb(String(next));
    connection.setLoggerStatus(next);
  };

  const deleteMessages = () => {
    deleteLogMessagesDb();
    connection.setLogger(undefined);
    setMessages([]);
    setQuery("");
    setConfirmDelete(false);
  };

  const exportMessages = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(messages, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dwarfium-device-log-${new Date().toISOString().replaceAll(":", "-")}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className={styles.logs}>
      <div className={styles.intro}>
        <div>
          <h2>Message log</h2>
          <p>
            Device commands and responses are saved on this computer for
            troubleshooting. Newest messages appear first.
          </p>
        </div>
        <div className={styles.status}>
          <span
            className={
              connection.loggerStatus ? styles.active : styles.inactive
            }
          >
            <span className={styles.statusDot} />
            Logger {connection.loggerStatus ? "on" : "off"}
          </span>
          <strong>{messages.length.toLocaleString()} messages</strong>
        </div>
      </div>

      <p>
        Device messages are stored in this browser or app. Export them below to
        include with a bug report. Both editions also save service output in{" "}
        <code>DwarfiumProxy.log</code> and <code>mediamtx.log</code>. In the
        Windows desktop app, find them in{" "}
        <code>%LOCALAPPDATA%\com.Dwarfium.build\logs</code>. In standalone, open{" "}
        <code>var/log</code> in the extracted folder.
      </p>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <i className="bi bi-search" aria-hidden="true" />
          <span className="visually-hidden">Search messages</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search commands, codes or payloads"
          />
        </label>
        <div className={styles.actions}>
          <button
            className="dw-button is-secondary"
            disabled={messages.length === 0}
            onClick={exportMessages}
          >
            Export logs
          </button>
          <button className="dw-button is-secondary" onClick={toggleLogger}>
            {connection.loggerStatus ? "Pause logging" : "Start logging"}
          </button>
          <button
            className="dw-button is-secondary"
            disabled={messages.length === 0}
            onClick={() => setConfirmDelete(true)}
          >
            Clear logs
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className={styles.confirm} role="alert">
          <p>
            Delete all {messages.length.toLocaleString()} saved messages from
            this computer?
          </p>
          <div className={styles.actions}>
            <button
              className="dw-button is-secondary"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
            <button className="dw-button" onClick={deleteMessages}>
              Delete messages
            </button>
          </div>
        </div>
      )}

      <p className={styles.hint}>
        Logs can contain network or device details. Review payloads before
        sharing them.
      </p>

      {filtered.length ? (
        <div className={styles.list}>
          <div className={styles.listHeading}>
            <h3>Messages</h3>
            <span>
              Showing {Math.min(visibleCount, filtered.length).toLocaleString()}{" "}
              of {filtered.length.toLocaleString()}
            </span>
          </div>
          {filtered.slice(0, visibleCount).map(({ message, sequence }) => (
            <LogMessageItem
              key={sequence}
              message={message}
              sequence={sequence}
            />
          ))}
          {visibleCount < filtered.length && (
            <button
              className="dw-button is-secondary"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Show 50 more
            </button>
          )}
        </div>
      ) : (
        <div className={styles.empty}>
          <i className="bi bi-terminal" aria-hidden="true" />
          <h3>{query ? "No matching messages" : "No messages yet"}</h3>
          <p>
            {query
              ? "Try a command name, numeric code, or another search term."
              : "Start logging, then connect to a DWARF to record commands and responses."}
          </p>
        </div>
      )}
    </div>
  );
}
