import { useContext } from "react";
import type { FormEvent } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";
import { wsURL, startGoto, startGotoCmd, socketSend } from "@/lib/dwarfii_api";

export default function ExecuteGoto() {
  let connectionCtx = useContext(ConnectionContext);

  function submitHandler(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const formRa = Number(formData.get("ra"));
    const formDeclination = Number(formData.get("declination"));

    updateTelescope(formRa, formDeclination);
  }

  function updateTelescope(ra: number, declination: number) {
    const socket = new WebSocket(wsURL);
    let lat = connectionCtx.latitude;
    let lon = connectionCtx.longitude;

    socket.addEventListener("open", () => {
      console.log("start startGoto...");
      let planet = null;
      let options = startGoto(
        planet,
        ra,
        declination,
        lat as number,
        lon as number
      );
      socketSend(socket, options);
    });

    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      if (message.interface === startGotoCmd) {
        console.log("startGoto:", message);
      } else {
        console.log(message);
      }
    });

    socket.addEventListener("error", (message) => {
      console.log("startGoto error:", message);
    });
  }

  function fetchStellariumData() {
    let url = connectionCtx.urlStellarium;
    if (url) {
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          console.log(data.selectioninfo);
        })
        .catch((err) => console.error(err));
    }
  }

  return (
    <div>
      <h2>Manual Goto</h2>

      <form onSubmit={submitHandler}>
        <div className="row mb-3">
          <div className="col-sm-4">
            <button className="btn btn-primary" onClick={fetchStellariumData}>
              Fetch data from Stellarium
            </button>
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-sm-4">
            <label htmlFor="ra" className="form-label">
              Right Acension
            </label>
          </div>
          <div className="col-sm-8">
            <input
              pattern="^-?\d*(\.\d+)?$"
              className="form-control"
              id="ra"
              name="ra"
              placeholder="-12.3456"
              required
            />
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-sm-4">
            <label htmlFor="declination" className="form-label">
              Declination
            </label>
          </div>
          <div className="col-sm-8">
            <input
              pattern="^-?\d*(\.\d+)?$"
              className="form-control"
              id="declination"
              name="declination"
              placeholder="56.7890"
              required
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </form>
    </div>
  );
}
