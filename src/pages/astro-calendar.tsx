import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import i18n from "@/i18n";
import SpaceCalendarFeed from "@/components/SpaceCalendarFeed";
import PageHeader from "@/components/shared/PageHeader";

export default function AstroCalendar() {
  const { t } = useTranslation();
  const [, setSelectedLanguage] = useState("en");

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      void i18n.changeLanguage(storedLanguage);
    }
  }, []);

  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Plan"
        title={t("pCalendarTitle")}
        description={`${t("pCalendarYear")} ${new Date().getFullYear()} · upcoming celestial events and observing opportunities.`}
      />
      <section className="dw-panel dw-calendar-feed">
        <SpaceCalendarFeed />
      </section>
    </div>
  );
}
