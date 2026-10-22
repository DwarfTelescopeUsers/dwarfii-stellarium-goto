import {
  fetchConnectionStatusDB,
  fetchConnectionStatusStellariumDB,
  saveConnectionStatusDB,
  saveConnectionStatusStellariumDB,
} from "@/db/db_utils";

describe("saved connection state", () => {
  beforeEach(() => localStorage.clear());

  test.each([true, false])("restores DWARF status %s", (connected) => {
    saveConnectionStatusDB(connected);
    expect(fetchConnectionStatusDB()).toBe(connected);
  });

  test.each([true, false])("restores Stellarium status %s", (connected) => {
    saveConnectionStatusStellariumDB(connected);
    expect(fetchConnectionStatusStellariumDB()).toBe(connected);
  });

  test("leaves missing status undefined", () => {
    expect(fetchConnectionStatusDB()).toBeUndefined();
    expect(fetchConnectionStatusStellariumDB()).toBeUndefined();
  });
});
