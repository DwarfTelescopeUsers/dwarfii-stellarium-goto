import { useState, useEffect, useContext } from "react";

import { ConnectionContext } from "@/stores/ConnectionContext";

export default function DSOSearch() {
  let connectionCtx = useContext(ConnectionContext);

  const [searchTxtValue, setSearchTxtValue] = useState(connectionCtx.searchTxt);

  useEffect(() => {
    console.log(searchTxtValue);
  }, [searchTxtValue]); // eslint-disable-line react-hooks/exhaustive-deps

  function searchHandler() {
    if (searchTxtValue === "") {
      connectionCtx.setSearchTxt(searchTxtValue);
    }

    if (searchTxtValue) {
      if (/^[\w\s]{0,255}$/i.test(searchTxtValue)) {
        connectionCtx.setSearchTxt(searchTxtValue);
      }
    } else {
      setSearchTxtValue("");
      connectionCtx.setSearchTxt("");
    }
  }

  return (
    <div>
      <div className="row mb-3">
        <div className="col-lg-1 col-md-2">
          <button className="btn btn-more02" onClick={searchHandler}>
            Search
          </button>
        </div>
        <div className="col-lg-4 col-md-10">
          <input
            pattern="^[\w\s]{0,255}$/i"
            className="form-control"
            placeholder=""
            id="search"
            name="search"
            value={searchTxtValue}
            onInput={(e) => setSearchTxtValue(e.currentTarget.value)}
          />
        </div>
      </div>
    </div>
  );
}
