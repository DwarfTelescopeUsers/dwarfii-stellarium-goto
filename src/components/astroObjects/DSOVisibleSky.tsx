import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import React, { useState, useContext, useEffect } from "react";
import { ConnectionContext } from "@/stores/ConnectionContext";

type PropType = {
  updateVisibleSkyLimit: (value: string) => void;
};

export default function DSOVisibleSky({ updateVisibleSkyLimit }: PropType) {
  let connectionCtx = useContext(ConnectionContext);
  const [visibleSkyLimitValue, setVisibleSkyLimitValue] = useState(
    connectionCtx.visibleSkyLimit ?? "",
  );
  const [showTooltip, setShowTooltip] = useState(false);

  function setSkyLimitHandler(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateVisibleSkyLimit(visibleSkyLimitValue);
  }

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

  return (
    <form className="dw-target-filter" onSubmit={setSkyLimitHandler}>
      <div className="dw-target-filter-label">
        <label htmlFor="target-sky-limit">{t("cVisibleSkyLimit")}</label>
        <button
          type="button"
          className="dw-target-help-button"
          aria-label="Show sky visibility limit format"
          aria-expanded={showTooltip}
          aria-controls="target-sky-limit-help"
          onClick={() => setShowTooltip(!showTooltip)}
        >
          <i className="bi bi-info-circle" aria-hidden="true" />
        </button>
      </div>
      <div className="dw-target-input-action">
        <input
          pattern="^[0-9NSEWnsew,;\\s-]{0,255}$"
          className="form-control"
          placeholder="Example: 20 N, 15 E-SE"
          id="target-sky-limit"
          name="setLimit"
          value={visibleSkyLimitValue}
          onChange={(e) => setVisibleSkyLimitValue(e.target.value)}
        />
        <button className="btn btn-more02" type="submit">
          Apply
        </button>
      </div>
      {showTooltip && (
        <div className="dw-sky-limit-help" id="target-sky-limit-help">
          {t("cSkyLimitHelp1")}
          <br />
          {t("cSkyLimitHelp2")}
          <br />
          {t("cSkyLimitHelp3")}
          <br />
          {t("cSkyLimitHelp4")}
          <br />
          {t("cSkyLimitHelp5")}
          <br />
          {t("cSkyLimitHelp6")}
          <br />
          {t("cSkyLimitHelp7")}
        </div>
      )}
    </form>
  );
}
