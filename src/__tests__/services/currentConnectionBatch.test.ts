import { createCurrentPacket, getCurrentProfile } from "dwarfii_api";
import { WebSocketHandler } from "@/services/dwarf/connection";

test("uses the installed SDK rather than a nested checkout", () => {
  expect(typeof jest.requireActual("dwarfii_api").getCurrentProfile).toBe(
    "function",
  );
  expect(typeof getCurrentProfile).toBe("function");
  expect(require.resolve("dwarfii_api").replace(/\\/g, "/")).toBe(
    process.cwd().replace(/\\/g, "/") +
      "/node_modules/dwarfii_api/dist/index.js",
  );
});

test.each([true, false])(
  "invalid command rejects the complete batch (invalid first: %s)",
  async (invalidFirst) => {
    const connection = new WebSocketHandler("192.0.2.1");
    jest.spyOn(connection, "isConnected").mockReturnValue(true);
    const request = jest
      .spyOn(connection, "request")
      .mockResolvedValue({} as any);
    const diagnostic = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const photo = createCurrentPacket(getCurrentProfile(4), "takeTelePhoto");
    const onError = jest.fn();
    try {
      await connection.prepare(
        invalidFirst ? ["invalid", photo] : [photo, "invalid"],
        "test",
        [],
        jest.fn(),
        jest.fn(),
        onError,
      );
      expect(request).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
    } finally {
      diagnostic.mockRestore();
    }
  },
);

test("a valid batch keeps command order and proto3 zero defaults", async () => {
  const connection = new WebSocketHandler("192.0.2.1");
  jest.spyOn(connection, "isConnected").mockReturnValue(true);
  const request = jest
    .spyOn(connection, "request")
    .mockResolvedValue({} as any);
  const profile = getCurrentProfile(2);
  await connection.prepare([
    createCurrentPacket(profile, "switchShootingMode", { mode: 0 }),
    createCurrentPacket(profile, "takeWidePhoto"),
  ]);
  expect(request.mock.calls).toEqual([
    ["switchShootingMode", { mode: 0 }],
    ["takeWidePhoto", {}],
  ]);
});

test("commands submitted offline cannot replay when the connection returns", async () => {
  const connection = new WebSocketHandler("192.0.2.1");
  const connected = jest
    .spyOn(connection, "isConnected")
    .mockReturnValue(false);
  const request = jest
    .spyOn(connection, "request")
    .mockResolvedValue({} as any);
  const diagnostic = jest.spyOn(console, "error").mockImplementation(() => {});
  const onError = jest.fn();
  try {
    await connection.prepare(
      createCurrentPacket(getCurrentProfile(4), "takeTelePhoto"),
      "offline capture",
      [],
      jest.fn(),
      jest.fn(),
      onError,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    connected.mockReturnValue(true);
    await connection.prepare([]);
    expect(request).not.toHaveBeenCalled();
  } finally {
    diagnostic.mockRestore();
  }
});

test("an obsolete batch cannot clear or report an error into a replacement workspace", async () => {
  const connection = new WebSocketHandler("192.0.2.1");
  jest.spyOn(connection, "isConnected").mockReturnValue(true);
  let rejectOld!: (error: Error) => void;
  const request = jest
    .spyOn(connection, "request")
    .mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectOld = reject;
        }),
    )
    .mockResolvedValue({} as any);
  const diagnostic = jest.spyOn(console, "error").mockImplementation(() => {});
  const profile = getCurrentProfile(4);
  const onError = jest.fn();
  try {
    const old = connection.prepare([
      createCurrentPacket(profile, "switchShootingMode", { mode: 0 }),
      createCurrentPacket(profile, "takeTelePhoto"),
    ]);
    connection.close();
    await connection.prepare(
      createCurrentPacket(profile, "switchShootingMode", { mode: 1 }),
      "new workspace",
      [],
      jest.fn(),
      jest.fn(),
      onError,
    );
    rejectOld(new Error("old transport closed"));
    await old;
    await Promise.resolve();
    expect(request.mock.calls).toEqual([
      ["switchShootingMode", { mode: 0 }],
      ["switchShootingMode", { mode: 1 }],
    ]);
    expect(onError).not.toHaveBeenCalled();
  } finally {
    diagnostic.mockRestore();
  }
});
