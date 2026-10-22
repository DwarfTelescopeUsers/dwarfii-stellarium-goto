import LogMessages from "@/components/LogMessages";
import PageHeader from "@/components/shared/PageHeader";

export default function LogMessagesPage() {
  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Diagnostics"
        title="Application logs"
        description="Review connection events and device commands when troubleshooting a session."
      />
      <section className="dw-panel dw-tool-panel">
        <LogMessages />
      </section>
    </div>
  );
}
