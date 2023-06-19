import React from "react";

export default function about() {
  return (
    <div>
      <h1>About</h1>
      <p>
        This website is a side project to combine my interest in coding and
        astronomy. To report bugs or view the code, vist the{" "}
        <a href="https://github.com/DwarfTelescopeUsers/dwarfii-stellarium-goto">
          Github repo.
        </a>
      </p>

      <h2>Data Credits</h2>
      <p>
        The data from the predefined observation list comes from several
        sources.
      </p>
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
        The info entered in by the users is stored in the browser (local
        storage). Pros of browser storage: easier to maintain the site, zero
        database costs. Cons of browser storage: cannot sync data from multiple
        browsers when user uses multiple browsers or multiple devices.
      </p>
    </div>
  );
}
