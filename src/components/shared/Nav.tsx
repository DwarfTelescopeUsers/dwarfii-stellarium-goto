import Link from "next/link";

export default function Nav() {
  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary">
      <div className="container">
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link active" aria-current="page" href="/">
                Home
              </Link>
            </li>

            <li className="nav-item">
              <Link
                className="nav-link active"
                aria-current="page"
                href="/setup-scope"
              >
                Setup Scope
              </Link>
            </li>

            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Imaging
              </a>
              <ul className="dropdown-menu">
                <li>
                  <Link
                    className="dropdown-item"
                    aria-current="page"
                    href="/astro-photos"
                  >
                    Astro
                  </Link>
                </li>
                <li>
                  <Link
                    className="dropdown-item"
                    aria-current="page"
                    href="/photos"
                  >
                    Photo
                  </Link>
                </li>
              </ul>
            </li>

            <li className="nav-item">
              <Link
                className="nav-link active"
                aria-current="page"
                href="/settings"
              >
                Settings
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
