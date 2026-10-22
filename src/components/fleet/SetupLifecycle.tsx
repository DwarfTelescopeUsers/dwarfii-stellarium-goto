import { useLoadIntialValues } from "@/hooks/useLoadIntialValues";
import { useSetupConnection } from "@/hooks/useSetupConnection";

/** Mounted once, outside device-scoped contexts and route-dependent chrome. */
export default function SetupLifecycle() {
  useLoadIntialValues();
  // Setup connections require an explicit Connect action. Persisted legacy
  // readiness must not open a competing socket during Fleet hydration.
  useSetupConnection(false);
  return null;
}
