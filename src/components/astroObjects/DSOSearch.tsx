import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import React, { useState, useContext, useEffect } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";

type PropType = {
  updateSearchText: (value: string) => void;
};

export default function DSOSearch({ updateSearchText }: PropType) {
  let connectionCtx = useContext(ConnectionContext);
  const [searchTxtValue, setSearchTxtValue] = useState(
    connectionCtx.searchTxt ?? "",
  );

  const { t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    }
  }, []);

  function searchHandler(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateSearchText(searchTxtValue);
  }

  return (
    <form className="dw-target-filter" onSubmit={searchHandler}>
      <label htmlFor="target-search">Search catalog</label>
      <div className="dw-target-input-action">
        <input
          pattern="^[A-Za-z0-9_\s-]{0,255}$"
          className="form-control"
          type="search"
          placeholder="Name or catalog number (for example, M31)"
          id="target-search"
          name="search"
          value={searchTxtValue}
          onChange={(e) => setSearchTxtValue(e.target.value)}
        />
        <button className="btn btn-more02" type="submit">
          <i className="bi bi-search" aria-hidden="true" />
          {t("cObjectsSearch")}
        </button>
      </div>
    </form>
  );
}
