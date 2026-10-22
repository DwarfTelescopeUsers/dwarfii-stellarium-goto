import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";

export default function DebugPage() {
  return (
    <div className="dw-page">
      <PageHeader
        eyebrow="Diagnostics"
        title="Debugging"
        description="Choose a diagnostic view for application or telescope troubleshooting."
      />
      <div className="dw-quick-actions">
        <Link href="/logs" className="dw-quick-action">
          <i className="bi bi-terminal" aria-hidden="true" />
          <span>
            <strong>Message logs</strong>
            <small>Inspect app and device communication</small>
          </span>
        </Link>
        <Link href="/device-status" className="dw-quick-action">
          <i className="bi bi-activity" aria-hidden="true" />
          <span>
            <strong>Camera status</strong>
            <small>Inspect live ISP and hardware state</small>
          </span>
        </Link>
      </div>
    </div>
  );
}
