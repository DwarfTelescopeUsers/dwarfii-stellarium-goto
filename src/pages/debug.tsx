import Link from "next/link";
import StatusBar from "@/components/shared/StatusBar";
import { useSetupConnection } from "@/hooks/useSetupConnection";
import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";

export default function DebugPage() {
  useSetupConnection();
  useLoadIntialValues();

  return (
    <div>
      <StatusBar />
      <h1>Debugging</h1>
      <ol>
        <li>
          <Link href="/logs">Message Logs</Link>
        </li>
        <li>
          <Link href="/dwarfii-status">Camera Status</Link>
        </li>
      </ol>
    </div>
  );
}
