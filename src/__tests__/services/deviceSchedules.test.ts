import { DeviceSchedules } from "@/services/dwarf/schedules";

const packet = (data: Record<string, unknown>) =>
  ({ known: true, type: 1, data }) as any;
const row = {
  scheduleId: "native-1",
  scheduleName: "M45",
  state: 1,
  deviceId: 4,
};
function setup() {
  const socket = {
    session: { state: { generation: 1, ownership: "control" } },
    isConnected: () => true,
    request: jest.fn(
      async (_operation: string, _values?: Record<string, unknown>) =>
        packet({ shootingSchedule: [row] }),
    ),
  };
  return {
    socket,
    service: new DeviceSchedules(socket, "192.0.2.1", 4, async () => ({
      hardwareId: 4,
      macAddress: "00:11:22:33:44:55",
    })),
  };
}
function nativeImport() {
  return {
    format: "dwarfium-native-schedule-v1",
    host: "192.0.2.1",
    hardwareId: 4,
    schedule: {
      scheduleId: "new-plan",
      scheduleName: "New plan",
      deviceId: 4,
      macAddress: "00:11:22:33:44:55",
      startTime: "2000000000",
      endTime: "2000000600",
      paramVersion: 1,
      params: JSON.stringify({
        focusMode: 0,
        latitude: 0,
        longitude: 0,
        cityName: "",
      }),
      shootingTasks: [
        {
          scheduleId: "new-plan",
          scheduleTaskId: "task-1",
          paramVersion: 1,
          params: JSON.stringify({
            startTime: 2000000000,
            endTime: 2000000600,
            ra: 3.78,
            dec: 24.1,
            shutterIndex: 162,
            count: 0,
          }),
        },
      ],
    },
  };
}

test("a stale response never becomes the next device's verified schedule list", async () => {
  const { socket, service } = setup();
  socket.request.mockImplementationOnce(async () => {
    socket.session.state.generation++;
    return packet({ shootingSchedule: [row] });
  });
  await expect(service.list()).rejects.toThrow("connection changed");
  expect(() => service.export(row.scheduleId)).toThrow("connection changed");
});

test("cancel verifies its ID without relying on the empty-list handler", async () => {
  const { socket, service } = setup();
  await expect(service.cancel("other-device-id")).rejects.toThrow(
    "does not belong",
  );
  await service.list();
  socket.session.state.ownership = "observe";
  await expect(service.cancel(row.scheduleId)).rejects.toThrow(
    "Request control",
  );
  socket.session.state.ownership = "control";
  socket.request.mockResolvedValueOnce(packet({ code: 0 }));
  socket.request.mockResolvedValueOnce(packet({ code: -16305 }));
  await expect(service.cancel(row.scheduleId, "secret")).resolves.toEqual([]);
  expect(socket.request).toHaveBeenNthCalledWith(2, "cancelShootingSchedule", {
    id: row.scheduleId,
    password: "secret",
  });
  expect(socket.request).toHaveBeenLastCalledWith("getShootingScheduleById", {
    id: row.scheduleId,
  });
});

test("native submission preserves opaque app task JSON and never replaces device plans", async () => {
  const { socket, service } = setup();
  await service.list();
  const value = nativeImport();
  socket.request.mockResolvedValueOnce(packet({ shootingSchedule: [row] }));
  socket.request.mockResolvedValueOnce(packet({ code: 0 }));
  socket.request.mockResolvedValueOnce(
    packet({ shootingSchedule: [row, value.schedule] }),
  );
  await service.sync(value, 1000);
  expect(socket.request).toHaveBeenCalledWith("syncShootingSchedule", {
    shootingSchedule: { ...value.schedule, state: 1 },
  });
  expect(
    socket.request.mock.calls.some(
      ([operation]) => operation === "replaceShootingSchedule",
    ),
  ).toBe(false);
});

test.each(["active", "wrong-id", "timeout"])(
  "cancel remains unverified after %s readback",
  async (kind) => {
    const { socket, service } = setup();
    await service.list();
    socket.request.mockResolvedValueOnce(packet({ code: 0 }));
    if (kind === "timeout")
      socket.request.mockRejectedValueOnce(new Error("Read timed out"));
    else
      socket.request.mockResolvedValueOnce(
        packet({
          shootingSchedule: {
            ...row,
            scheduleId: kind === "wrong-id" ? "another-id" : row.scheduleId,
            state: kind === "active" ? 1 : 3,
          },
        }),
      );
    await expect(service.cancel(row.scheduleId)).rejects.toThrow();
    expect(service.export(row.scheduleId).schedule.scheduleId).toBe(
      row.scheduleId,
    );
  },
);

test("rejects wrong device, milliseconds and tasks outside the native time window without writes", async () => {
  const { socket, service } = setup();
  await service.list();
  await expect(
    service.sync({ ...nativeImport(), host: "192.0.2.2" }, 1000),
  ).rejects.toThrow("exact DWARF");
  const value = nativeImport();
  value.schedule.shootingTasks[0].params = JSON.stringify({
    startTime: 2000000000000,
    endTime: 2000000600000,
  });
  await expect(service.sync(value, 1000)).rejects.toThrow("time window");
  expect(socket.request).toHaveBeenCalledTimes(1);
});

test("nonzero device errors and unsupported reads remain errors rather than empty lists", async () => {
  const { socket, service } = setup();
  socket.request.mockRejectedValueOnce(new Error("Request timed out"));
  await expect(service.list()).rejects.toThrow("timed out");
  socket.request.mockResolvedValueOnce(packet({ code: -1 }));
  await expect(service.list()).rejects.toThrow();
});

test("a schedule ACK without its exact ID in device readback remains unverified", async () => {
  const { socket, service } = setup();
  await service.list();
  socket.request.mockResolvedValueOnce(packet({ shootingSchedule: [row] }));
  socket.request.mockResolvedValueOnce(packet({ code: 0 }));
  await expect(service.sync(nativeImport(), 1000)).rejects.toThrow(
    "did not confirm",
  );
});

test.each(["short", "running"])(
  "invalid %s native imports never write",
  async (kind) => {
    const { socket, service } = setup();
    const value = nativeImport();
    if (kind === "short")
      value.schedule.shootingTasks[0].params = JSON.stringify({
        startTime: 2000000000,
        endTime: 2000000599,
      });
    else Object.assign(value.schedule, { state: 2 });
    await expect(service.sync(value, 1000)).rejects.toThrow(
      kind === "short" ? "10 minutes" : "pending native plans",
    );
    expect(socket.request).not.toHaveBeenCalled();
  },
);

test("an older overlapping list cannot replace a newer device schedule snapshot", async () => {
  const { socket, service } = setup();
  let finishOld!: (value: any) => void;
  socket.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishOld = resolve;
      }),
  );
  const old = service.list();
  await service.list();
  finishOld(packet({ shootingSchedule: [{ ...row, scheduleId: "obsolete" }] }));
  await expect(old).rejects.toThrow("newer schedule read");
  expect(service.export(row.scheduleId).schedule).toEqual(row);
  expect(() => service.export("obsolete")).toThrow("Refresh schedules");
});
