import {
  buildBleCommandArguments,
  getBleDeviceNames,
  parseBleHelperOutput,
} from "../../../server/ble-helper";

describe("Bluetooth helper integration", () => {
  it("always starts the helper in non-interactive command mode", () => {
    expect(
      buildBleCommandArguments({
        blePassword: "DWARF_12345678",
        wifiSsid: "Observatory",
        wifiPassword: "secret",
        selectedDevice: "DWARF_mini_BC5D00",
      }),
    ).toEqual([
      "--psd",
      "DWARF_12345678",
      "--ssid",
      "Observatory",
      "--pwd",
      "secret",
      "--select",
      "DWARF_mini_BC5D00",
      "--cmd",
    ]);
  });

  it("parses the final structured helper message from prefixed log output", () => {
    const output = [
      "Scanning for devices...",
      "NOTICE - {'step': '1', 'dwarf_devices': [BLEDevice(BE:EF:BE:EF:29:73, DWARF_mini_BC5D00)], 'error': None}",
      "NOTICE - {'step': '4', 'is_connected': True, 'device_dwarf_id': 3, 'ip_address': '192.168.178.90'}",
    ].join("\n");

    expect(parseBleHelperOutput(output)).toEqual({
      step: "4",
      is_connected: true,
      device_dwarf_id: 3,
      ip_address: "192.168.178.90",
    });
  });

  it("extracts selectable DWARF names from BLE device descriptions", () => {
    expect(
      getBleDeviceNames([
        "BE:EF:BE:EF:29:73, DWARF_mini_BC5D00",
        "BE:EF:BE:EF:70:34, DWARF3_55138A",
      ]),
    ).toEqual(["DWARF_mini_BC5D00", "DWARF3_55138A"]);
  });
});
