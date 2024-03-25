import { useContext, useState } from "react";
import Head from "next/head";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";

import StatusBar from "@/components/shared/StatusBar";
import DwarfCameras from "@/components/DwarfCameras";
import ImagingMenu from "@/components/imaging/ImagingMenu";

export default function AstroPhoto() {
  useSetupConnection();
  useLoadIntialValues();
  let connectionCtx = useContext(ConnectionContext);

  const [showWideangle, setShowWideangle] = useState(true);
  const [useRawPreviewURL, setUseRawPreviewURL] = useState(false);
  const [notification, setNotification] = useState(null);
  let notConnected =
    connectionCtx.connectionStatus === undefined ||
    connectionCtx.connectionStatus === false;
  let noCoordinates =
    connectionCtx.latitude === undefined ||
    connectionCtx.longitude === undefined;
  let hasErrors = notConnected || noCoordinates;

  const getSessionData = async () => {
    try {
      // Open dialog window to select folder on PC
      const selectedFolder = await window.showDirectoryPicker();
      console.log("Selected folder on PC:", selectedFolder);
  
      // Fetch content of provided URL
      const response = await fetch("http://192.168.178.56/sdcard/DWARF_II/Astronomy/");
      const data = await response.text();
      
      // Parse HTML content to extract folder names and creation dates
      const folderRegex = /href="([^"]*?)\/"[^>]*?>([^<]+)<\/a>\s+(\d{2}-[a-zA-Z]{3}-\d{4} \d{2}:\d{2})/g;
      let matches;
      let latestFolder;
      let latestFolderDate = new Date(0);
      while ((matches = folderRegex.exec(data)) !== null) {
        const folderName = matches[1];
        const folderDate = new Date(matches[3]);
        if (folderDate > latestFolderDate) {
          latestFolderDate = folderDate;
          latestFolder = folderName;
        }
      }
      if (!latestFolder) {
        console.error("No folder found.");
        return;
      }
      console.log("Latest folder on the given URL:", latestFolder);
  
      // Fetch files within the latest folder
      const folderResponse = await fetch(`http://192.168.178.56/sdcard/DWARF_II/Astronomy/${latestFolder}`);
      const folderData = await folderResponse.text();
      // Extract fits files
      const fitsFiles = folderData.match(/href="([^"]*\.fits)"/g).map(match => match.substring(6, match.length - 1));
      console.log("List of images in the latest folder:", fitsFiles);
  
      // Write fits files to selected folder
      for (const fitsFile of fitsFiles) {
        const fileResponse = await fetch(`http://192.168.178.56/sdcard/DWARF_II/Astronomy/${latestFolder}/${fitsFile}`);
        const fileBlob = await fileResponse.blob();
        const fileHandle = await selectedFolder.getFileHandle(fitsFile, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(fileBlob);
        await writable.close();
      }
      console.log("Files downloaded successfully.");
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('User aborted the operation.');
      } else {
        console.error('An error occurred:', error.message);
      }
    }
  };
  
  
  

  if (hasErrors) {
    return (
      <>
        <Head>
          <title>Astro Photos</title>
        </Head>
        <StatusBar />

        <h1>Astro Photos</h1>

        {notConnected && (
          <p className="text-danger">You must connect to Dwarf II.</p>
        )}

        {noCoordinates && (
          <p className="text-danger">You must set your location.</p>
        )}
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Astro Photos</title>
      </Head>
      <StatusBar />
      <div className="container">
        <div className="row px-0">
          <main className="col">
            <DwarfCameras
              showWideangle={showWideangle}
              useRawPreviewURL={useRawPreviewURL}
            />
          </main>

          <div style={{ width: "60px" }} className="px-0">
            <ImagingMenu
              setShowWideangle={setShowWideangle}
              setUseRawPreviewURL={setUseRawPreviewURL}
            />
          </div>
        </div>
      </div>
      <div className="bottom-container">
        {notification && <div className="notification">{notification}</div>}
        <button onClick={getSessionData}>Get Session Data</button>
      </div>
      <style jsx>{`
        .bottom-container {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
        }
        
        .notification {
          background-color: #ffcccc;
          color: #ff0000;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 10px;
        }
      `}</style>
    </>
  );
}
