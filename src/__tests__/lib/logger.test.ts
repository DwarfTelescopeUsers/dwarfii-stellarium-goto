import { logger } from "@/lib/logger";

test("the first enabled log message initializes an empty UI list and persists", () => {
  localStorage.clear();
  let records: any;
  const context: any = {
    loggerStatus: true,
    setLogger: (update) => {
      records = update(records);
    },
  };
  logger("Device response", { cmd: 16405 }, context);
  expect(records).toEqual([{ cmd: 16405 }]);
  expect(JSON.parse(localStorage.getItem("logMessages")!)).toEqual(records);
});

test("disabled logging writes neither UI state nor storage", () => {
  localStorage.clear();
  const context: any = { loggerStatus: false, setLogger: jest.fn() };
  logger("Device response", { cmd: 16405 }, context);
  expect(context.setLogger).not.toHaveBeenCalled();
  expect(localStorage.getItem("logMessages")).toBeNull();
});
