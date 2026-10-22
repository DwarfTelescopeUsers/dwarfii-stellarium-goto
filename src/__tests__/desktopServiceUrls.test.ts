import {
  getIpServerMTX,
  getProxyUrl,
  getServerUrl,
  proxyHostname,
  shouldUseHttpsPreview,
  checkMediaMtxStreamUrls,
} from "@/lib/get_proxy_url";
import type { ConnectionContextType } from "@/types";

jest.mock("@tauri-apps/api/core", () => ({
  isTauri: () =>
    Boolean((globalThis as typeof globalThis & { isTauri?: boolean }).isTauri),
}));

const connection = {
  proxyIP: "192.168.178.20",
  proxyLocalIP: "192.168.178.21",
  proxyInLan: true,
} as ConnectionContextType;

afterEach(() => {
  delete (globalThis as typeof globalThis & { isTauri?: boolean }).isTauri;
});

test("desktop service URLs use the bundled loopback proxy, not tauri.localhost", () => {
  (globalThis as typeof globalThis & { isTauri?: boolean }).isTauri = true;

  expect(getProxyUrl(connection)).toBe("http://127.0.0.1:8860");
  expect(getIpServerMTX()).toBe("localhost");
  expect(getServerUrl()).toBe("/api");
});

test("browser service URLs can still use a LAN proxy", () => {
  process.env.NEXT_PUBLIC_PORT_PROXY_CORS = "8860";
  expect(getProxyUrl(connection)).toBe("http://192.168.178.21:8860");
  expect(getIpServerMTX()).toBe("127.0.0.1");
});

test("MediaMTX service health does not require legacy singleton paths", async () => {
  const previousFetch = global.fetch;
  const fetcher = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ hls: true }) });
  global.fetch = fetcher;
  try {
    const abort = new AbortController();
    await expect(
      checkMediaMtxStreamUrls(connection, 1000, abort.signal),
    ).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(new URL(fetcher.mock.calls[0][0]).searchParams.get("target")).toBe(
      "http://127.0.0.1:9997/v3/config/global/get",
    );
  } finally {
    global.fetch = previousFetch;
  }
});

test("HTTPS standalone rejects a stale insecure proxy URL and keeps HLS local", () => {
  expect(
    proxyHostname("http://192.168.0.120:8095", "127.0.0.1", "https:"),
  ).toBe("127.0.0.1");
  expect(proxyHostname("192.168.0.120", "127.0.0.1", "https:")).toBe(
    "192.168.0.120",
  );
  expect(proxyHostname("http://192.168.0.120:8095", "127.0.0.1", "http:")).toBe(
    "192.168.0.120",
  );
});

test("HLS follows the page scheme even before Connection setup has been opened", () => {
  expect(shouldUseHttpsPreview(true, false, "https:")).toBe(true);
  expect(shouldUseHttpsPreview(true, false, "http:")).toBe(false);
  expect(shouldUseHttpsPreview(false, true, "https:")).toBe(false);
});
