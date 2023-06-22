export default function about() {
  return (
    <div>
      <h1>About</h1>
      <p>
        This website is a side project to combine my interest in coding,
        astronomy and the Dwarf II API. To report bugs or view the code, vist
        the{" "}
        <a href="https://github.com/DwarfTelescopeUsers/dwarfii-stellarium-goto">
          Github repo.
        </a>
      </p>

      <h2>Data Credits</h2>
      <p>The data for the observation lists comes from several sources.</p>
      <ul>
        <li>
          The data about the DSO comes from{" "}
          <a href="https://github.com/mattiaverga/OpenNGC">
            OpenNGC objects database
          </a>
          .
        </li>
        <li>
          Dr Michael Camilleri, Auckland Astronomical Society, New Zealand
          provided object names and sizes for the DSO that are 15 arc minutes or
          larger.
        </li>
        <li>
          The data about the stars comes from{" "}
          <a href="https://github.com/astronexus/HYG-Database">
            HYG Stellar database
          </a>
          .
        </li>
        <li>
          The data about the visual magnitude of planets and Moon comes from{" "}
          <a href="https://en.wikipedia.org/wiki/Apparent_magnitude">
            Wikipedia.
          </a>
        </li>
        <li>
          The constellation data comes from{" "}
          <a href="https://en.wikipedia.org/wiki/IAU_designated_constellations">
            Wikipedia.
          </a>
        </li>
      </ul>
      <p>
        The{" "}
        <a href="https://github.com/DwarfTelescopeUsers/dwarfii-stellarium-goto/tree/main/notebooks">
          Jupyter notebooks
        </a>{" "}
        in the Github repo shows the steps I took transform the raw data into
        the observation lists.
      </p>

      <p>
        This site use code from{" "}
        <a href="https://github.com/commenthol/astronomia">Astronomia</a> and{" "}
        <a href="https://www.celestialprogramming.com">
          celestialprogramming.com
        </a>{" "}
        to do the astronomical calculations.
      </p>

      <h2>User Data</h2>
      <p>
        The info entered in by the users is stored in the browser&apos;s
        database (localStorage). Since the data is stored in your browser, other
        users of the site will not be able to access your data. This also means
        if a user uses multiple browsers or devices, the data can not be synced
        between the different browsers or devices.
      </p>
    </div>
  );
}
