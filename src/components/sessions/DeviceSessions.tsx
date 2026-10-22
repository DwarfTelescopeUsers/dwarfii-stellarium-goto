import { useCallback, useContext, useEffect, useState } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";
import { getProxyUrl } from "@/lib/get_proxy_url";
import PageHeader from "@/components/shared/PageHeader";
import PhotoEditor from "@/components/photoeditor/PhotoEditor";
import styles from "./DeviceSessions.module.css";

type AstroDetails = {
  target?: string;
  shotsTaken?: number;
  shotsStacked?: number;
  shotsToTake?: number;
  params?: { exp?: string; gain?: string; filter?: string; format?: string };
};

type AlbumSession = {
  fileName: string;
  filePath?: string;
  thumbnailPath?: string;
  modificationTime?: number;
  astroImageDetails?: AstroDetails;
  astroMosaicImageDetails?: AstroDetails;
  astroMultiImageDetails?: AstroDetails;
};

function validDevicePath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !path.split("/").includes("..")
  );
}

function sessionDetails(session: AlbumSession): AstroDetails {
  return (
    session.astroImageDetails ??
    session.astroMosaicImageDetails ??
    session.astroMultiImageDetails ??
    {}
  );
}

export default function DeviceSessions() {
  const connection = useContext(ConnectionContext);
  const host = connection.IPDwarf;
  const proxy = getProxyUrl(connection);
  const [sessions, setSessions] = useState<AlbumSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [selected, setSelected] = useState<AlbumSession | null>(null);

  const deviceUrl = useCallback(
    (path: unknown) =>
      validDevicePath(path)
        ? `${proxy}?target=${encodeURIComponent(`http://${host}${path}`)}`
        : "",
    [host, proxy],
  );

  useEffect(() => {
    if (!host || !proxy) {
      setSessions([]);
      setError("Select and connect a DWARF to view its sessions.");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setSessions([]);
    const endpoint = `${proxy}?target=${encodeURIComponent(`http://${host}:8082/album/list/mediaInfos`)}`;
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType: 6, pageIndex: 0, pageSize: 0 }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Album request failed (${response.status}).`);
        const payload = await response.json();
        if (payload.code !== 0 || !Array.isArray(payload.data)) {
          throw new Error("The device did not return an astronomy album.");
        }
        return payload.data as AlbumSession[];
      })
      .then((items) => {
        if (!controller.signal.aborted) {
          setSessions(
            items
              .filter((item) => typeof item.fileName === "string")
              .sort(
                (a, b) => (b.modificationTime ?? 0) - (a.modificationTime ?? 0),
              ),
          );
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load sessions.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [host, proxy, refreshIndex]);

  const downloadImage = async (session: AlbumSession) => {
    const url = deviceUrl(session.filePath);
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Download failed (${response.status}).`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${session.fileName}.jpg`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Download failed.");
    }
  };

  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Sessions"
        title="Device sessions"
        description={`Astronomy images stored on ${connection.typeNameDwarf || "the selected DWARF"}. Switch devices in Fleet to view another album.`}
        actions={
          <button
            className="dw-button is-secondary"
            onClick={() => setRefreshIndex((value) => value + 1)}
            disabled={loading}
          >
            Refresh sessions
          </button>
        }
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="dw-panel" role="status">
          Loading sessions from the device…
        </div>
      ) : sessions.length === 0 && !error ? (
        <div className="dw-panel">
          No astronomy sessions are stored on this device yet.
        </div>
      ) : (
        <div className={styles.grid}>
          {sessions.map((session) => {
            const details = sessionDetails(session);
            const image = deviceUrl(session.thumbnailPath || session.filePath);
            const fullImage = deviceUrl(session.filePath);
            return (
              <article
                className={`dw-panel ${styles.card}`}
                key={session.fileName}
              >
                {image ? (
                  <img
                    className={styles.thumbnail}
                    src={image}
                    alt={`Preview of ${details.target || session.fileName}`}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className={styles.thumbnail}
                    aria-label="No preview available"
                  />
                )}
                <div className={styles.content}>
                  <h2>
                    {(details.target || session.fileName).replaceAll("_", " ")}
                  </h2>
                  <p className={styles.meta}>
                    {[
                      details.params?.filter,
                      details.params?.exp && `${details.params.exp}s`,
                      details.params?.gain && `Gain ${details.params.gain}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Astronomy capture"}
                  </p>
                  <p className={styles.meta}>
                    {details.shotsTaken ?? "—"} taken ·{" "}
                    {details.shotsStacked ?? "—"} stacked
                    {details.shotsToTake !== undefined
                      ? ` · ${details.shotsToTake} planned`
                      : ""}
                  </p>
                  <div className={styles.actions}>
                    {fullImage && (
                      <button
                        className="dw-button is-secondary"
                        onClick={() => setSelected(session)}
                      >
                        View image
                      </button>
                    )}
                    {fullImage && (
                      <button
                        className="dw-button is-secondary"
                        onClick={() => void downloadImage(session)}
                      >
                        Download JPG
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selected && (
        <PhotoEditor
          thumbnailUrl={deviceUrl(selected.thumbnailPath || selected.filePath)}
          fullImageUrl={deviceUrl(selected.filePath)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
