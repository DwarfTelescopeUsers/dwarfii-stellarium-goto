import { bleNameFromResult } from "@/services/fleet/bleIdentity";
import { FleetRegistry } from "@/services/fleet/registry";

describe("Fleet Bluetooth identity", () => {
  it("reconstructs the advertised names returned by the BLE helper", () => {
    expect(
      bleNameFromResult({
        device_dwarf_id: 3,
        device_dwarf_uid: "mini_6a5316",
      }),
    ).toBe("DWARF_mini_6a5316");
    expect(
      bleNameFromResult({ device_dwarf_id: 2, device_dwarf_uid: "55138A" }),
    ).toBe("DWARF3_55138A");
    expect(
      bleNameFromResult({ dwarf_device: "BE:EF, DWARF_mini_BC5D00" }),
    ).toBe("DWARF_mini_BC5D00");
  });

  it("stores a BLE identifier independently of the DHCP address", () => {
    const registry = new FleetRegistry(
      () => "123e4567-e89b-42d3-a456-426614174000",
    );
    const device = registry.register({
      alias: "Garden Mini",
      lastKnownHost: "192.168.178.53",
    });
    registry.updateReportedName(device.id, "DWARF_mini_6a5316");
    registry.updateHost(device.id, "192.168.178.90");
    expect(registry.getDevice(device.id)).toMatchObject({
      reportedName: "DWARF_mini_6a5316",
      lastKnownHost: "192.168.178.90",
    });
    expect(() =>
      registry.updateReportedName(device.id, "not a device"),
    ).toThrow();
  });
});
