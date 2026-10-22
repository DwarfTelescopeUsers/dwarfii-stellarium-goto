import { reduceActivity, summarizeActivity } from "@/services/fleet/activity";
import type { CurrentPacket } from "dwarfii_api";

const notification = (cmd: number, state: number) =>
  ({
    cmd,
    moduleId: 9,
    rawData: new Uint8Array(),
    type: 2,
    known: true,
    data: { state },
  }) as CurrentPacket;

test("explicitly empty subsystem states report idle, not unknown", () => {
  const empty = { exclusiveState: {} };
  const evidence = reduceActivity({}, {
    ...notification(16405, 0),
    type: 3,
    data: {
      teleCameraStateInfo: empty,
      wideCameraStateInfo: empty,
      focusMotorStateInfo: empty,
      motionMotorStateInfo: empty,
    },
  } as CurrentPacket);
  expect(summarizeActivity(evidence)).toBe("idle");
});

test("nested one-click target tracking is working, not unknown", () => {
  const evidence = reduceActivity({}, {
    ...notification(16405, 0),
    type: 3,
    data: {
      motionMotorStateInfo: {
        exclusiveState: {
          oneClickGotoState: {
            astroTrackingState: { state: 1, targetName: "Vega" },
          },
        },
      },
    },
  } as CurrentPacket);
  expect(summarizeActivity(evidence)).toBe("tracking");
});

test("wide idle cannot clear tele capture; focus cannot erase capture", () => {
  let evidence = reduceActivity({}, notification(15208, 1));
  evidence = reduceActivity(evidence, notification(15236, 0));
  evidence = reduceActivity(evidence, notification(15278, 1));
  expect(summarizeActivity(evidence)).toBe("capturing");
  evidence = reduceActivity(evidence, notification(15208, 3));
  expect(summarizeActivity(evidence)).toBe("focusing");
});

test("partial idle information stays unknown", () => {
  expect(summarizeActivity(reduceActivity({}, notification(15208, 0)))).toBe(
    "unknown",
  );
});

test("snapshot rehydrates active capture without a command or UI intent", () => {
  const evidence = reduceActivity({}, {
    cmd: 16405,
    moduleId: 14,
    rawData: new Uint8Array(),
    type: 1,
    known: true,
    data: {
      teleCameraStateInfo: {
        exclusiveState: { captureRawState: { state: 1 } },
      },
    },
  } as CurrentPacket);
  expect(summarizeActivity(evidence)).toBe("capturing");
});

test("ACK and unknown states do not change activity", () => {
  const initial = { tele: 1 };
  expect(reduceActivity(initial, { ...notification(15208, 0), type: 1 })).toBe(
    initial,
  );
  expect(reduceActivity(initial, notification(15208, 90))).toBe(initial);
});
