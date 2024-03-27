import { useContext, useState, useEffect } from "react";
import Head from "next/head";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";

import StatusBar from "@/components/shared/StatusBar";

export default function AstroPhoto() {
  useSetupConnection();
  useLoadIntialValues();
  let connectionCtx = useContext(ConnectionContext);

  const [notification] = useState(null as string | null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [getSessionDataDisabled, setGetSessionDataDisabled] = useState(true);
  const [progress, setProgress] = useState(0);

  let notConnected =
    connectionCtx.connectionStatus === undefined ||
    connectionCtx.connectionStatus === false;
  let noCoordinates =
    connectionCtx.latitude === undefined ||
    connectionCtx.longitude === undefined;
  let hasErrors = notConnected || noCoordinates;

  interface Session {
    name: string;
    date: string;
  }

  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await fetch(
          `http://${connectionCtx.IPDwarf}/sdcard/DWARF_II/Astronomy/`
        );
        const data = await response.text();
        const folderRegex =
          /href="([^"]*?)\/"[^>]*?>([^<]+)<\/a>\s+(\d{2}-[a-zA-Z]{3}-\d{4} \d{2}:\d{2})/g;
        let matches;
        let sessionList: Session[] = [];
        while ((matches = folderRegex.exec(data)) !== null) {
          sessionList.push({ name: matches[1], date: matches[3] });
        }
        if (sessionList.length > 0) setSessions(sessionList);
      } catch (error: any) {
        console.error(
          "An error occurred while fetching sessions:",
          error.message
        );
        setSessions([]);
      }
    }
    fetchSessions();
  }, [connectionCtx.IPDwarf]);

  const getSessionData = async () => {
    if (!selectedSession) {
      console.error("No session selected.");
      return;
    }

    try {
      if ("showDirectoryPicker" in window) {
        const selectedFolder = await (window as any).showDirectoryPicker();
        const sessionFolderHandle = await selectedFolder.getDirectoryHandle(
          selectedSession,
          { create: true }
        ); // Create folder with session name
        const folderResponse = await fetch(
          `http://${connectionCtx.IPDwarf}/sdcard/DWARF_II/Astronomy/${selectedSession}`
        );
        const folderData = await folderResponse.text();
        if (folderData !== null) {
          // Access properties and perform operations on folderData safely
          const fitsFilesMatch = folderData.match(/href="([^"]*\.fits)"/g);
          if (fitsFilesMatch !== null) {
            const fitsFiles = fitsFilesMatch.map((match) =>
              match.substring(6, match.length - 1)
            );
            const totalFiles = fitsFiles.length;
            let downloadedFiles = 0;
            for (const fitsFile of fitsFiles) {
              const fileResponse = await fetch(
                `http://${connectionCtx.IPDwarf}/sdcard/DWARF_II/Astronomy/${selectedSession}/${fitsFile}`
              );
              const fileBlob = await fileResponse.blob();
              const fileHandle = await sessionFolderHandle.getFileHandle(
                fitsFile,
                {
                  create: true,
                }
              ); // Save file in session folder
              const writable = await fileHandle.createWritable();
              await writable.write(fileBlob);
              await writable.close();
              downloadedFiles++;
              setProgress(Math.floor((downloadedFiles / totalFiles) * 100));
            }
            console.log("Files downloaded successfully.");
          } else {
            console.log("No Files found.");
          }
        }
      } else {
        console.error(
          "File System Access API is not supported in this browser."
        );
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error("User aborted the operation.");
      } else {
        console.error("An error occurred:", error.message);
      }
    }
  };

  const handleSessionChange = (event) => {
    setSelectedSession(event.target.value);
    setGetSessionDataDisabled(false);
    setProgress(0);
  };

  if (hasErrors) {
    return (
      <>
        <section className="daily-horp d-inline-block w-100">
          <div className="container">
            <Head>
              <title>Session Data</title>
            </Head>
            <StatusBar />

            <h1>Session Data</h1>

            {notConnected && (
              <p className="text-danger">You must connect to Dwarf II.</p>
            )}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {" "}
      <section className="daily-horp d-inline-block w-100">
        <div className="container">
          <br />
          <br />
          <br />
          <br />
          <Head>
            <title>Session Data</title>
          </Head>
          <StatusBar />
          <div className="container-image-session">
            {notification && <div className="notification">{notification}</div>}
            <select value={selectedSession} onChange={handleSessionChange}>
              <option value="">Select a session...</option>
              {sessions.map((session, index) => (
                <option key={index} value={session.name}>
                  {session.name} - {session.date}
                </option>
              ))}
            </select>
            <br />
            <br />
            <button
              className=" btn btn-more02"
              onClick={getSessionData}
              disabled={getSessionDataDisabled}
            >
              Get Session Data
            </button>
            <div className="progress-container">
              <div className="progress" style={{ width: `${progress}%` }}></div>
              <span className="progress-text">{progress}%</span>
            </div>
          </div>
          {""}
          <br />
          <br />
          <br />
          Thumbnails maybe?
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
        </div>
      </section>
    </>
  );
}
