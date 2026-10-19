import { getAttendance, getMyAttendance } from "../../../../services/attendanceService";
import { calendarDays, dayStatus, isWebSession, loadAttendanceRange, monthBounds, personKey, mobileAttendanceAccess, resolveAttendanceAccess } from "./attendanceAppData";
jest.mock("../../../../services/attendanceService", () => ({ getAttendance: jest.fn(), getMyAttendance: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
test("calendar handles leap years and Monday alignment without inventing absence", () => {
  expect(monthBounds("2024-02").to).toBe("2024-02-29");
  expect(calendarDays("2024-02").filter(Boolean)).toHaveLength(29);
  expect(calendarDays("2026-06")[0]).toBe("2026-06-01");
  expect(dayStatus(null, "2026-10-01", "2026-10-15")).toBe("No record");
  expect(dayStatus(null, "2026-10-16", "2026-10-15")).toBe("Upcoming");
  expect(dayStatus({ firstInAt: "2026-10-15T04:00:00Z" }, "2026-10-15", "2026-10-15")).toBe("Checked in");
  expect(dayStatus({ firstInAt: "2026-10-14T04:00:00Z" }, "2026-10-14", "2026-10-15")).toBe("Missing checkout");
});
test("only active supported WEB records may expose checkout", () => {
  expect(isWebSession({ primarySource: "WEB", workMode: "WFH" })).toBe(true);
  expect(isWebSession({ primarySource: "BIOMETRIC", workMode: "WFH" })).toBe(false);
  expect(isWebSession({ primarySource: "WEB", workMode: "OFFICE" })).toBe(false);
});
test("employee and management permissions remain separate", () => {
  expect(resolveAttendanceAccess({ role: "EMPLOYEE" }).canViewRegister).toBe(false);
  expect(resolveAttendanceAccess({ role: "MANAGER" }).canViewRegister).toBe(true);
  expect(resolveAttendanceAccess({ role: "MANAGER" }).canExport).toBe(false);
  expect(resolveAttendanceAccess({ systemRole: "SUPER_ADMIN" }).canApproveRegularization).toBe(true);
});
test("full API slices continue despite incorrect page totals and synthetic rows cannot replace punches", async () => {
  const records = Array.from({ length: 500 }, (_, index) => ({ _id: `row${index}`, employeeId: `employee${index}`, businessDate: "2026-10-15", firstInAt: "2026-10-15T04:00:00Z" }));
  getAttendance.mockResolvedValueOnce({ items: records, pagination: { pages: 1 } }).mockResolvedValueOnce({ items: [{ ...records[0], synthetic: true, firstInAt: null }, { _id: "last", employeeId: "employee500", businessDate: "2026-10-15" }], pagination: { pages: 1 } });
  const result = await loadAttendanceRange({ from: "2026-10-15", to: "2026-10-15" });
  expect(result.records).toHaveLength(501);
  expect(result.records[0].firstInAt).toBeTruthy();
  expect(getAttendance).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 500 }));
});
test("unmapped workers retain device identity and truncation is surfaced", async () => {
  getAttendance.mockResolvedValue({ items: [], biometric: { items: [{ biometricCode: "42", deviceCode: "A", businessDate: "2026-10-15" }, { biometricCode: "42", deviceCode: "B", businessDate: "2026-10-15" }], truncated: true } });
  const result = await loadAttendanceRange({});
  expect(result.records).toHaveLength(2);
  expect(personKey(result.records[0])).not.toBe(personKey(result.records[1]));
  expect(result.truncated).toBe(true);
});
test("personal calendar uses only the self API", async () => {
  getMyAttendance.mockResolvedValue({ items: [{ employeeId: "me", businessDate: "2026-10-15" }] });
  await loadAttendanceRange(monthBounds("2026-10"), true);
  expect(getMyAttendance).toHaveBeenCalledWith(expect.objectContaining({ includeUnmapped: false }));
  expect(getAttendance).not.toHaveBeenCalled();
});

test("management scope follows the backend access map and legacy admin fallback", () => {
  expect(mobileAttendanceAccess({ role: "EMPLOYEE" }, { accessMap: { ATTENDANCE: { VIEW: "TEAM" } } }).canViewRegister).toBe(true);
  expect(mobileAttendanceAccess({ role: "ADMIN" }).canViewRegister).toBe(true);
  expect(mobileAttendanceAccess({ role: "EMPLOYEE" }, { accessMap: { ATTENDANCE: { VIEW: "SELF" } } }).canViewRegister).toBe(false);
  expect(mobileAttendanceAccess({ role: "MANAGER" }).canViewLocationHistory).toBe(false);
});
