import React from "react";
import { act, render } from "@testing-library/react";

const mockControllers: {
  callback: (event: any) => void;
  destroy: jest.Mock;
}[] = [];
jest.mock("joystick-controller", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((_options, callback) => {
    const controller = { callback, destroy: jest.fn() };
    mockControllers.push(controller);
    return controller;
  }),
}));
jest.mock("@/stores/ConnectionContext", () => ({
  ConnectionContext: require("react").createContext({}),
}));
import CameraJoystick from "@/components/imaging/CameraJoystick";
import { ConnectionContext } from "@/stores/ConnectionContext";

const movement = { distance: 1, angle: 0, leveledX: 8, leveledY: 0 };
function context() {
  return {
    socketIPDwarf: {
      isConnected: () => true,
      request: jest.fn().mockResolvedValue({ data: {} }),
    },
    setDeviceError: jest.fn(),
  } as any;
}
const view = (value: any) => (
  <ConnectionContext.Provider value={value}>
    <CameraJoystick />
  </ConnectionContext.Provider>
);
beforeEach(() => {
  mockControllers.length = 0;
});

test("controller is mounted once per socket and stale callbacks cannot move a previous fleet device", async () => {
  const first = context();
  const second = context();
  const screen = render(view(first));
  const old = mockControllers[0];
  screen.rerender(view({ ...first }));
  expect(mockControllers).toHaveLength(1);
  await act(async () => {
    old.callback(movement);
  });
  expect(first.socketIPDwarf.request).toHaveBeenCalledWith("joystick", {
    vectorAngle: 0,
    vectorLength: 0.8,
  });
  screen.rerender(view(second));
  expect(old.destroy).toHaveBeenCalledTimes(1);
  expect(first.socketIPDwarf.request).toHaveBeenLastCalledWith(
    "stopJoystick",
    {},
  );
  const priorCalls = first.socketIPDwarf.request.mock.calls.length;
  await act(async () => {
    old.callback(movement);
  });
  expect(first.socketIPDwarf.request).toHaveBeenCalledTimes(priorCalls);
  expect(second.socketIPDwarf.request).not.toHaveBeenCalled();
  await act(async () => {
    mockControllers[1].callback(movement);
  });
  expect(second.socketIPDwarf.request).toHaveBeenCalledWith("joystick", {
    vectorAngle: 0,
    vectorLength: 0.8,
  });
  screen.unmount();
  expect(mockControllers[1].destroy).toHaveBeenCalledTimes(1);
  expect(second.socketIPDwarf.request).toHaveBeenLastCalledWith(
    "stopJoystick",
    {},
  );
});

test("an immediate release still stops motion within the movement throttle period", async () => {
  const ctx = context();
  render(view(ctx));
  await act(async () => {
    mockControllers[0].callback(movement);
  });
  await act(async () => {
    mockControllers[0].callback({ ...movement, distance: 0 });
  });
  expect(ctx.socketIPDwarf.request).toHaveBeenLastCalledWith(
    "stopJoystick",
    {},
  );
});
