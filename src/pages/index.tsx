export default function Home() {
  return (
    <div>
      <h1>Dwarf II App</h1>
      <p>
        This website allows you to control parts of the Dwarf II using the Dwarf
        API.
      </p>
      Features:
      <ul>
        <li>Object list with over 250 objects.</li>
        <li>Import objects lists from Telescopius.</li>
        <li>Connect to Stellarium planeterium app to help select targets.</li>
        <li>Take Astro photos.</li>
        <li>1x1 binning for astro photos.</li>
      </ul>
      <p>
        This website and the Dwarf API are in beta phase. The API hasn&apos;t
        been officially released, and the API doesn&apos;t have all the features
        of the mobile app, therefore this app has a very limited list of
        features. Only use this app if you are comfortable with being testers
        for beta software.
      </p>
      Bugs:
      <ul>
        <li>
          The API does not correctly return the number images taken (10014).
          Users should look at the mobile app to keep track of the imagining
          progress.
        </li>
        <li>
          Dwarf II ignores the API command to stop the taking astro photos
          (10015) once imaging has started. Users need to use the mobile app to
          stop taking photos.
        </li>
        <li>
          Dwarf II&apos;s internal date url does not work in the browser because
          of CORS (http://DWARF_IP:8092/date?date=).
        </li>
        <li>Goto does not move the Dwarf II to the correct position.</li>
      </ul>
    </div>
  );
}
