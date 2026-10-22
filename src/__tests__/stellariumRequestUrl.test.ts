import { stellariumRequestUrl } from "@/lib/stellarium_utils";
import type { ConnectionContextType } from "@/types";

jest.mock("@/lib/get_proxy_url", () => ({
  getProxyUrl: () => "/api/proxy",
}));

test("Stellarium status uses the local proxy without a saved proxy IP", () => {
  const target = "http://127.0.0.1:8090/api/main/status";
  expect(stellariumRequestUrl(target, {} as ConnectionContextType)).toBe(
    `/api/proxy?target=${encodeURIComponent(target)}`,
  );
});
