import { CurrentDwarfSchema } from "dwarfii_api";
import { decodeV3DeviceStateTelemetry } from "@/services/dwarf/telemetry";

const snapshot = (values: Record<string, unknown>) =>
  CurrentDwarfSchema.ResGetDeviceStateInfo.encode(values).finish();

describe("canonical V3 device-state telemetry", () => {
  it("rejects invalid Mini CMOS readings and uses valid system temperature", () => {
    const value = decodeV3DeviceStateTelemetry(
      snapshot({
        teleCameraStateInfo: { cmosTemperature: { temperature: -270 } },
        deviceStateInfo: { temperature: { temperature: 31 } },
      }),
    );
    expect(value?.temperature).toBe(31);
    expect(
      decodeV3DeviceStateTelemetry(
        snapshot({
          teleCameraStateInfo: { cmosTemperature: { temperature: -270 } },
        }),
      )?.temperature,
    ).toBeUndefined();
  });
  it("decodes battery, charging, storage and temperature fields", () => {
    const deviceState = [
      26,
      2,
      8,
      1, // charging_state.state = 1
      34,
      8,
      8,
      42,
      16,
      64,
      24,
      1,
      32,
      1, // storage_info
      58,
      4,
      8,
      0,
      16,
      36, // temperature.temperature = 36
      74,
      2,
      8,
      73, // battery_info.percentage = 73
    ];
    const response = new Uint8Array([50, deviceState.length, ...deviceState]);

    expect(decodeV3DeviceStateTelemetry(response)).toEqual({
      batteryPercentage: 73,
      chargingState: 1,
      availableSize: 42,
      totalSize: 64,
      storageValid: true,
      temperature: 36,
    });
  });

  it("prefers the telephoto CMOS temperature", () => {
    const teleCamera = [58, 2, 8, 35];
    const deviceState = [58, 4, 8, 0, 16, 41];
    const response = new Uint8Array([
      18,
      teleCamera.length,
      ...teleCamera,
      50,
      deviceState.length,
      ...deviceState,
    ]);

    expect(decodeV3DeviceStateTelemetry(response)?.temperature).toBe(35);
  });

  it("rejects a failed snapshot even when it contains apparently valid values", () => {
    expect(
      decodeV3DeviceStateTelemetry(
        snapshot({
          code: -1,
          deviceStateInfo: { batteryInfo: { percentage: 73 } },
          teleCameraStateInfo: { cmosTemperature: { temperature: 35 } },
        }),
      ),
    ).toBeUndefined();
  });

  it.each([{}, { deviceStateInfo: {} }, { teleCameraStateInfo: {} }])(
    "does not invent readings for absent nested telemetry: %j",
    (value) => {
      expect(decodeV3DeviceStateTelemetry(snapshot(value))).toBeUndefined();
    },
  );

  it("preserves scalar defaults only within present telemetry messages", () => {
    expect(
      decodeV3DeviceStateTelemetry(
        snapshot({
          deviceStateInfo: {
            batteryInfo: {},
            chargingState: {},
            storageInfo: {},
            temperature: {},
          },
        }),
      ),
    ).toEqual({
      batteryPercentage: 0,
      chargingState: 0,
      availableSize: 0,
      totalSize: 0,
      storageValid: false,
      temperature: 0,
    });
  });

  it("retains optional CMOS zero and negative temperatures", () => {
    for (const temperature of [0, -5]) {
      expect(
        decodeV3DeviceStateTelemetry(
          snapshot({
            teleCameraStateInfo: { cmosTemperature: { temperature } },
            deviceStateInfo: { temperature: { temperature: 41 } },
          }),
        )?.temperature,
      ).toBe(temperature);
    }
  });

  it("does not interpret an absent optional CMOS temperature as zero", () => {
    expect(
      decodeV3DeviceStateTelemetry(
        snapshot({
          teleCameraStateInfo: { cmosTemperature: { cameraType: 0 } },
        }),
      ),
    ).toBeUndefined();
    expect(
      decodeV3DeviceStateTelemetry(
        snapshot({
          teleCameraStateInfo: { cmosTemperature: {} },
          deviceStateInfo: { temperature: { temperature: 41 } },
        }),
      )?.temperature,
    ).toBe(41);
  });

  it("ignores failed system-temperature readings without losing valid telemetry", () => {
    const result = decodeV3DeviceStateTelemetry(
      snapshot({
        deviceStateInfo: {
          temperature: { code: -1, temperature: 41 },
          batteryInfo: { percentage: 73 },
        },
      }),
    );
    expect(result?.temperature).toBeUndefined();
    expect(result?.batteryPercentage).toBe(73);
  });

  it("retains unsigned storage sizes and explicit validity", () => {
    const result = decodeV3DeviceStateTelemetry(
      snapshot({
        deviceStateInfo: {
          storageInfo: {
            availableSize: 0,
            totalSize: 4294967295,
            isValid: true,
          },
        },
      }),
    );
    expect(result?.availableSize).toBe(0);
    expect(result?.totalSize).toBe(4294967295);
    expect(result?.storageValid).toBe(true);
    expect(result?.batteryPercentage).toBeUndefined();
  });

  it.each([-1, 101])("rejects invalid battery percentage %i", (percentage) => {
    expect(
      decodeV3DeviceStateTelemetry(
        snapshot({ deviceStateInfo: { batteryInfo: { percentage } } }),
      ),
    ).toBeUndefined();
  });

  it("rejects malformed input instead of returning a partial earlier reading", () => {
    const valid = snapshot({
      deviceStateInfo: { batteryInfo: { percentage: 73 } },
    });
    expect(
      decodeV3DeviceStateTelemetry(
        new Uint8Array([...Array.from(valid), 0xff]),
      ),
    ).toBeUndefined();
    expect(
      decodeV3DeviceStateTelemetry(new Uint8Array([50, 20, 74, 2])),
    ).toBeUndefined();
  });
});
