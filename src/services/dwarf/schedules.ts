import {
  assertCurrentSuccess,
  CurrentProtocolError,
  type CurrentCommand,
  type CurrentPacket,
} from "dwarfii_api";
import type { ScheduleDeviceIdentity } from "./timedSchedule";

export type NativeSchedule = Record<string, unknown> & {
  scheduleId: string;
  scheduleName?: string;
  state?: number;
  lock?: number;
  password?: string;
};
type ScheduleSocket = {
  isConnected(): boolean;
  session?: { state: { generation: number; ownership: string } };
  request(
    operation: CurrentCommand,
    values?: Record<string, unknown>,
  ): Promise<CurrentPacket>;
};
export type NativeScheduleExport = {
  format: "dwarfium-native-schedule-v1";
  host: string;
  hardwareId: number;
  schedule: NativeSchedule;
};

/** Native tasks contain versioned app JSON. Preserve it exactly rather than
 * interpreting count/stacked as a requested frame count (they are telemetry).
 * Every instance is bound to one physical connection generation.
 */
export class DeviceSchedules {
  private generation: number;
  private known = new Map<string, NativeSchedule>();
  private listed = false;
  private pending = false;
  private ownedSession: ScheduleSocket["session"];
  private listRevision = 0;

  constructor(
    private socket: ScheduleSocket,
    readonly host: string,
    readonly hardwareId: number,
    private discoverIdentity?: () => Promise<ScheduleDeviceIdentity>,
    private signal?: AbortSignal,
  ) {
    this.generation = socket.session?.state.generation ?? -1;
    this.ownedSession = socket.session;
  }

  async identity(): Promise<ScheduleDeviceIdentity> {
    this.check(true);
    if (!this.discoverIdentity)
      throw new Error(
        "Device identity verification is unavailable. Reopen the scheduler for this connected device.",
      );
    const identity = await this.discoverIdentity();
    this.check(true);
    if (
      identity.hardwareId !== this.hardwareId ||
      typeof identity.macAddress !== "string" ||
      !/^[0-9a-f]{12}$/i.test(identity.macAddress.replace(/[:-]/g, ""))
    )
      throw new Error(
        "Device discovery did not confirm this DWARF model and physical address.",
      );
    return identity;
  }

  private check(write = false) {
    if (
      this.signal?.aborted ||
      !this.socket.isConnected() ||
      this.generation < 0 ||
      this.socket.session !== this.ownedSession ||
      this.socket.session?.state.generation !== this.generation
    )
      throw new Error(
        "The DWARF connection changed. Refresh device schedules before retrying.",
      );
    if (write && this.socket.session?.state.ownership !== "control")
      throw new Error(
        "Request control of this DWARF before changing its schedules.",
      );
  }

  async list(): Promise<NativeSchedule[]> {
    this.check();
    const revision = ++this.listRevision;
    this.listed = false;
    this.known.clear();
    const packet = await this.socket.request("getAllShootingSchedule");
    this.check();
    if (revision !== this.listRevision)
      throw new Error(
        "A newer schedule read replaced this response. Read schedules again.",
      );
    assertCurrentSuccess(packet);
    const rows = packet.data.shootingSchedule ?? [];
    if (
      !Array.isArray(rows) ||
      rows.some(
        (row) => !row || typeof row.scheduleId !== "string" || !row.scheduleId,
      )
    )
      throw new Error("The device returned an invalid schedule list.");
    const ids = new Set(rows.map((row) => row.scheduleId));
    if (ids.size !== rows.length)
      throw new Error("The device returned duplicate schedule IDs.");
    this.known = new Map(rows.map((row) => [row.scheduleId, row]));
    this.listed = true;
    return rows;
  }

  export(scheduleId: string): NativeScheduleExport {
    this.check();
    const schedule = this.known.get(scheduleId);
    if (!schedule)
      throw new Error("Refresh schedules before exporting this item.");
    return {
      format: "dwarfium-native-schedule-v1",
      host: this.host,
      hardwareId: this.hardwareId,
      schedule,
    };
  }

  private async mutate(
    operation: CurrentCommand,
    values: Record<string, unknown>,
  ) {
    this.check(true);
    if (!this.listed)
      throw new Error("Read this device's schedules before changing them.");
    if (this.pending) throw new Error("A schedule change is already pending.");
    this.pending = true;
    try {
      const packet = await this.socket.request(operation, values);
      this.check(true);
      assertCurrentSuccess(packet);
      return packet;
    } finally {
      this.pending = false;
    }
  }

  async cancel(scheduleId: string, password = "") {
    const schedule = this.known.get(scheduleId);
    if (!schedule)
      throw new Error(
        "This schedule does not belong to the loaded device list.",
      );
    if (![0, 1, 2].includes(schedule.state ?? 0))
      throw new Error("Only pending or running schedules can be cancelled.");
    await this.mutate("cancelShootingSchedule", { id: scheduleId, password });
    // D3 never answers getAll when cancelling its last record. Verify this ID
    // directly after a successful cancellation ACK instead of waiting for it.
    let packet: CurrentPacket;
    try {
      packet = await this.socket.request("getShootingScheduleById", {
        id: scheduleId,
      });
    } catch (error) {
      if (
        !(error instanceof CurrentProtocolError) ||
        error.kind !== "device" ||
        error.code !== -16305
      )
        throw error;
      packet = {
        moduleId: 13,
        cmd: 16103,
        type: 1,
        known: true,
        rawData: new Uint8Array(),
        data: { code: -16305 },
      };
    }
    this.check(true);
    if (packet.data.code !== -16305) {
      assertCurrentSuccess(packet);
      const saved = packet.data.shootingSchedule;
      if (
        !saved ||
        saved.scheduleId !== scheduleId ||
        ![3, 4].includes(saved.state)
      )
        throw new Error(
          "The device did not confirm cancellation. Read schedules before retrying.",
        );
      this.known.set(scheduleId, saved);
    } else {
      this.known.delete(scheduleId);
    }
    this.listRevision++;
    return Array.from(this.known.values());
  }

  async sync(value: unknown, now = Date.now()) {
    const data = value as Partial<NativeScheduleExport> | null;
    if (
      !data ||
      data.format !== "dwarfium-native-schedule-v1" ||
      data.host !== this.host ||
      data.hardwareId !== this.hardwareId
    )
      throw new Error(
        "Import a native schedule exported for this exact DWARF address and model.",
      );
    const schedule = data.schedule;
    if (schedule?.state !== undefined && ![0, 1].includes(schedule.state))
      throw new Error(
        "Only new or pending native plans can be submitted. Reset completed or running plans before importing.",
      );
    const tasks = schedule?.shootingTasks;
    if (
      !schedule ||
      typeof schedule.scheduleId !== "string" ||
      !schedule.scheduleId ||
      typeof schedule.scheduleName !== "string" ||
      !schedule.scheduleName.trim() ||
      schedule.deviceId !== this.hardwareId ||
      schedule.paramVersion !== 1 ||
      (schedule.paramMode ?? 0) !== 0 ||
      typeof schedule.params !== "string" ||
      !Array.isArray(tasks) ||
      !tasks.length
    )
      throw new Error(
        "The native schedule has missing or unsupported parameters.",
      );
    const start = Number(schedule.startTime);
    const end = Number(schedule.endTime);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start <= now / 1000 ||
      end <= start
    )
      throw new Error(
        "Native schedule times must be future UNIX seconds with end after start.",
      );
    JSON.parse(schedule.params);
    const ids = new Set<string>();
    for (const task of tasks) {
      if (
        !task ||
        typeof task.scheduleTaskId !== "string" ||
        !task.scheduleTaskId ||
        ids.has(task.scheduleTaskId) ||
        task.scheduleId !== schedule.scheduleId ||
        task.paramVersion !== 1 ||
        (task.paramMode ?? 0) !== 0 ||
        typeof task.params !== "string"
      )
        throw new Error("The native schedule contains invalid tasks.");
      ids.add(task.scheduleTaskId);
      const params = JSON.parse(task.params);
      if (
        !Number.isSafeInteger(params.startTime) ||
        !Number.isSafeInteger(params.endTime) ||
        params.startTime < start ||
        params.endTime > end ||
        params.endTime <= params.startTime
      )
        throw new Error(
          "Every task must fit inside the schedule's time window.",
        );
      if (params.endTime - params.startTime < 600)
        throw new Error("Native timed tasks must last at least 10 minutes.");
    }
    // Never silently overwrite or replace another plan on the device.
    const [, identity] = await Promise.all([this.list(), this.identity()]);
    if (
      typeof schedule.macAddress !== "string" ||
      schedule.macAddress.replace(/[:-]/g, "").toLowerCase() !==
        identity.macAddress.replace(/[:-]/g, "").toLowerCase()
    )
      throw new Error(
        "The native schedule belongs to a different physical DWARF. Nothing was submitted.",
      );
    if (this.known.has(schedule.scheduleId))
      throw new Error(
        "This schedule ID already exists. Import a new schedule ID to avoid overwriting a device plan.",
      );
    if (start <= Math.max(now, Date.now()) / 1000)
      throw new Error(
        "The scheduled start passed while verifying the device. Choose a new future start time.",
      );
    const response = await this.mutate("syncShootingSchedule", {
      // Draft state is local to the official app. Firmware receives pending-shoot.
      shootingSchedule: { ...schedule, state: 1 },
    });
    if (response.data.timeConflictScheduleIds?.length)
      throw new Error(
        "The device reported a scheduling conflict. Refresh schedules to verify their state.",
      );
    const confirmed = await this.list();
    if (!confirmed.some((entry) => entry.scheduleId === schedule.scheduleId))
      throw new Error(
        "The device did not confirm the submitted schedule ID. Read device schedules before retrying.",
      );
    return confirmed;
  }
}
