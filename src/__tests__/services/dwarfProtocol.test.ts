import {
  configureDwarfProtocol,
  createV3ShootingModePacket,
  createV3OneClickGotoDsoPacket,
  createV3OneClickGotoSolarPacket,
  createV3SessionPackets,
  getDwarfDeviceProfile,
  WebSocketHandler,
} from "@/services/dwarf";
import { decodeCurrentPacket } from "dwarfii_api";

describe("current DWARF application protocol boundary", () => {
  test("socket instances have separate lifecycle and do not invent controller conflicts", async () => {
    const first = new WebSocketHandler("192.0.2.1");
    const second = new WebSocketHandler("192.0.2.2");
    expect(first).not.toBe(second);
    await first.cleanup(true);
    expect(first.isConnected()).toBe(false);
    expect(first.isReconnectSuppressed()).toBe(false);
    expect(second.IPDwarf).toBe("192.0.2.2");
  });

  test.each([1, 2, 4])(
    "configures hardware%i independently from wire identity",
    (id) => {
      const socket = new WebSocketHandler("192.0.2.1");
      const wireId = jest.spyOn(socket, "setDeviceIdDwarf");
      configureDwarfProtocol(socket, getDwarfDeviceProfile(id));
      expect(wireId).toHaveBeenCalledWith(4);
      expect(socket.isConnected()).toBe(false);
      expect(socket.session).toBeUndefined();
      expect(createV3SessionPackets()).toEqual([]);
    },
  );

  test("rejects unknown hardware instead of defaulting to Mini", () => {
    expect(() => getDwarfDeviceProfile(3)).toThrow("Unsupported DWARF");
  });

  test("temporary packet facade serializes canonical shooting mode and GOTO fields", () => {
    const socket = new WebSocketHandler("192.0.2.1");
    configureDwarfProtocol(socket, getDwarfDeviceProfile(4));
    expect(decodeCurrentPacket(createV3ShootingModePacket()).data).toEqual({
      mode: 2,
    });
    const packet = decodeCurrentPacket(
      createV3OneClickGotoDsoPacket(5.588, -5.391, "M42", 10.9, 49.4),
    );
    expect(packet.cmd).toBe(11013);
    expect(packet.data).toMatchObject({
      ra: 5.588,
      dec: -5.391,
      targetName: "M42",
      lon: 10.9,
      lat: 49.4,
      shootingMode: 2,
    });
    expect(packet.data).not.toHaveProperty("mode");
    expect(decodeCurrentPacket(createV3ShootingModePacket(8)).data).toEqual({
      mode: 8,
    });
    expect(
      decodeCurrentPacket(createV3OneClickGotoSolarPacket(0, 10.9, 49.4, "Sun"))
        .data.shootingMode,
    ).toBe(8);
  });

  test("mutations require a ready protocol session", async () => {
    const socket = new WebSocketHandler("192.0.2.1");
    configureDwarfProtocol(socket, getDwarfDeviceProfile(4));
    await expect(socket.request("astroAutoFocus", { mode: 1 })).rejects.toThrow(
      "wait for device status",
    );
  });
});
