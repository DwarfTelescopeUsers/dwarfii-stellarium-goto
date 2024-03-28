export default function Home() {
  return (
    <div>
      <section className="daily-horp-userlist d-inline-block w-100">
        <div className="container">
          {" "}
          <br />
          <br />
          <br />
          <br />
          <br />
          <h1>Dwarf II App</h1>
          <p>
            This website allows you to control parts of the Dwarf II using the
            Dwarf API.
          </p>
          Features:
          <ul>
            <li>Object list with over 250 objects.</li>
            <li>Import objects lists from Telescopius.</li>
            <li>Import Mosaic lists from Telescopius.</li>
            <li>
              Connect to Stellarium planeterium app to help select targets.
            </li>
            <li>Take Astro photos.</li>
            <li>1x1 binning for astro photos.</li>
          </ul>
          <p>
            This website and the Dwarf API are in beta phase. The API
            hasn&apos;t been officially released, and the API doesn&apos;t have
            all the features of the mobile app, therefore this app has a very
            limited list of features. Only use this app if you are comfortable
            with being testers for beta software.
          </p>
          Bugs:
          <ul>
            <li>
              Dwarf II&apos;s internal date url does not work in the browser
              because of CORS (http://DWARF_IP:8092/date?date=).
            </li>
            <li>
              To get it working, you need CORS: Access-Control-Allow-Origin
              Plugin on Chrome
            </li>
            <li>
              Restriction : as this website use only http mode to communicate
              with the dwarf, it can not detect your location.
            </li>
          </ul>
        </div>
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
      </section>
    </div>
  );
}
