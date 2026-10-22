import {
  devicePreviewPath,
  ensureDevicePreviewPaths,
} from "@/services/dwarf/previewPaths";
import type { ConnectionContextType } from "@/types";
jest.mock("@/lib/get_proxy_url", () => ({
  getIpServerMTX: () => "127.0.0.1",
  getProxyUrl: () => "http://127.0.0.1:8860",
}));
test("different telescope streams cannot overwrite a shared path", () => {
  expect(devicePreviewPath("192.0.2.1", "tele")).toBe("dwarf_192_0_2_1_tele");
  expect(devicePreviewPath("192.0.2.2", "tele")).not.toBe(
    devicePreviewPath("192.0.2.1", "tele"),
  );
  expect(() => devicePreviewPath("../other", "wide")).toThrow();
});
test("creates missing scoped paths with the correct RTSP camera source", async () => {
  const previousFetch = global.fetch;
  const sources = new Map<string, string>();
  const fetcher = jest.fn().mockImplementation(async (url, options) => {
    const name = decodeURIComponent(url).split("/").at(-1)!;
    if (options?.method === "POST") {
      sources.set(name, JSON.parse(options.body).source);
      return { ok: true };
    }
    return sources.has(name)
      ? { ok: true, json: async () => ({ source: sources.get(name) }) }
      : { ok: false, status: 404 };
  });
  global.fetch = fetcher;
  try {
    await ensureDevicePreviewPaths({
      IPDwarf: "192.0.2.1",
    } as ConnectionContextType);
    const writes = fetcher.mock.calls.filter(
      ([, options]) => options?.method === "POST",
    );
    expect(writes).toHaveLength(2);
    expect(decodeURIComponent(writes[0][0])).toContain(
      "/add/dwarf_192_0_2_1_tele",
    );
    expect(JSON.parse(writes[0][1].body).source).toBe(
      "rtsp://192.0.2.1:554/ch0/stream0",
    );
    expect(JSON.parse(writes[1][1].body).source).toBe(
      "rtsp://192.0.2.1:554/ch1/stream0",
    );
  } finally {
    global.fetch = previousFetch;
  }
});

test("connection changes during path discovery cannot issue a delayed update", async () => {
  const previousFetch = global.fetch;
  let generation = 1;
  global.fetch = jest.fn().mockImplementation(async () => {
    generation++;
    return { ok: false, status: 404 };
  });
  try {
    await expect(
      ensureDevicePreviewPaths({
        IPDwarf: "192.0.2.1",
        socketIPDwarf: {
          isConnected: () => true,
          get session() {
            return { state: { generation } };
          },
        },
      } as any),
    ).rejects.toThrow("connection changed");
    expect(
      jest
        .mocked(fetch)
        .mock.calls.every(([, options]) => options?.method !== "POST"),
    ).toBe(true);
  } finally {
    global.fetch = previousFetch;
  }
});

test("a stale address cannot configure paths for a different socket's telescope", async () => {
  await expect(
    ensureDevicePreviewPaths({
      IPDwarf: "192.0.2.2",
      socketIPDwarf: { IPDwarf: "192.0.2.1", isConnected: () => true },
    } as any),
  ).rejects.toThrow("connection changed");
});

test.each([true, false])(
  "same-device concurrent path creation is accepted only after source readback (%s)",
  async (matching) => {
    const previousFetch = global.fetch;
    const seen = new Set<string>();
    global.fetch = jest.fn().mockImplementation(async (url, options) => {
      const path = decodeURIComponent(url).split("/").at(-1)!;
      if (options?.method === "POST") return { ok: false, status: 400 };
      if (!seen.has(path)) {
        seen.add(path);
        return { ok: false, status: 404 };
      }
      return {
        ok: true,
        json: async () => ({
          source: `rtsp://${matching ? "192.0.2.1" : "192.0.2.2"}:554/ch${path.endsWith("tele") ? 0 : 1}/stream0`,
        }),
      };
    });
    try {
      const pending = ensureDevicePreviewPaths({ IPDwarf: "192.0.2.1" } as any);
      if (matching) await expect(pending).resolves.toBeUndefined();
      else await expect(pending).rejects.toThrow("not confirmed");
    } finally {
      global.fetch = previousFetch;
    }
  },
);
