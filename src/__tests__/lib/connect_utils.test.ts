jest.mock("@/services/dwarf", () => ({
  Dwarfii_Api: {
    DwarfCMD: {
      CMD_NOTIFY_ELE: 15201,
      CMD_NOTIFY_CHARGE: 15202,
      CMD_NOTIFY_SDCARD_INFO: 15203,
      CMD_NOTIFY_TEMPERATURE: 15243,
      CMD_V3_NOTIFY_TEMPERATURE2: 15292,
    },
    DwarfErrorCode: { OK: 0 },
  },
  V3_SESSION_READY_COMMAND: 16405,
}));

import { applyDeviceTelemetry } from "@/lib/connect_utils";
import { Dwarfii_Api } from "@/services/dwarf";

function createConnectionContext() {
  return {
    setBatteryLevelDwarf: jest.fn(),
    setBatteryStatusDwarf: jest.fn(),
    setAvailableSizeDwarf: jest.fn(),
    setTotalSizeDwarf: jest.fn(),
    setStatusTemperatureDwarf: jest.fn(),
  } as any;
}

describe("applyDeviceTelemetry", () => {
  it("applies the shared battery and storage notifications", () => {
    const connection = createConnectionContext();

    applyDeviceTelemetry(connection, {
      cmd: Dwarfii_Api.DwarfCMD.CMD_NOTIFY_ELE,
      data: { percentage: 74 },
    });
    applyDeviceTelemetry(connection, {
      cmd: Dwarfii_Api.DwarfCMD.CMD_NOTIFY_SDCARD_INFO,
      data: { availableSize: 42, totalSize: 64, isValid: true },
    });

    expect(connection.setBatteryLevelDwarf).toHaveBeenCalledWith(74);
    expect(connection.setAvailableSizeDwarf).toHaveBeenCalledWith(42);
    expect(connection.setTotalSizeDwarf).toHaveBeenCalledWith(64);
  });

  it("applies V3 temperature notifications", () => {
    const connection = createConnectionContext();

    applyDeviceTelemetry(connection, {
      cmd: Dwarfii_Api.DwarfCMD.CMD_V3_NOTIFY_TEMPERATURE2,
      data: { temperature: 37 },
    });

    expect(connection.setStatusTemperatureDwarf).toHaveBeenCalledWith(37);
  });

  it("reads the immediate temperature from the V3 device-state response", () => {
    const connection = createConnectionContext();

    applyDeviceTelemetry(connection, {
      cmd: 16405,
      data: {
        teleCameraStateInfo: { cmosTemperature: { temperature: 35 } },
      },
    });

    expect(connection.setStatusTemperatureDwarf).toHaveBeenCalledWith(35);
  });

  it("reads current V3 device telemetry from the complete schema", () => {
    const connection = createConnectionContext();

    applyDeviceTelemetry(connection, {
      cmd: 16405,
      data: {
        deviceStateInfo: {
          batteryInfo: { percentage: 73 },
          chargingState: { state: 1 },
          storageInfo: { availableSize: 42, totalSize: 64, isValid: true },
          temperature: { code: 0, temperature: 36 },
        },
      },
    });

    expect(connection.setBatteryLevelDwarf).toHaveBeenCalledWith(73);
    expect(connection.setBatteryStatusDwarf).toHaveBeenCalledWith(1);
    expect(connection.setAvailableSizeDwarf).toHaveBeenCalledWith(42);
    expect(connection.setTotalSizeDwarf).toHaveBeenCalledWith(64);
    expect(connection.setStatusTemperatureDwarf).toHaveBeenCalledWith(36);
  });
});
