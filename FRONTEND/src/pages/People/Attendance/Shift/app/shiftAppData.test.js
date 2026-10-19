import api from "../../../../../services/api";
import { getEmployeeMeta, getEmployees } from "../../../../../services/employeeService";
import { bulkAssignShift, ensureShiftRoster, getShiftRosterById } from "../../../../../services/shiftService";
import { applyAssignmentPlan, loadMobileRoster, loadShiftEmployees, mobileShiftAccess, planAssignments, scheduleOf } from "./shiftAppData";
jest.mock("../../../../../services/api", () => ({ get: jest.fn() }));
jest.mock("../../../../../services/employeeService", () => ({ getEmployeeMeta: jest.fn(), getEmployees: jest.fn() }));
jest.mock("../../../../../services/shiftService", () => ({ bulkAssignShift: jest.fn(), ensureShiftRoster: jest.fn(), getShiftRosterById: jest.fn() }));
const employee = { _id: "e1", fullName: "Demo Employee", orgUnitCode: "MACHINING" };
beforeEach(() => jest.clearAllMocks());
test("normal day is automatic and a night shift clearly ends the next day", () => {
  expect(scheduleOf(null, []).title).toBe("Normal day shift");
  expect(scheduleOf({ dayType: "WEEK_OFF" }, []).title).toBe("Week off");
  expect(scheduleOf({ dayType: "SHIFT", shiftId: "n" }, [{ _id: "n", name: "Night shift", type: "NIGHT", crossesMidnight: true, startTime: "17:30", endTime: "03:00" }])).toEqual(expect.objectContaining({ title: "Night shift", tone: "night", overnight: true }));
});
test("view, management and publish permissions remain distinct", () => {
  expect(mobileShiftAccess({ role: "EMPLOYEE" }).canManageRoster).toBe(false);
  expect(mobileShiftAccess({ role: "MANAGER" }).canManageRoster).toBe(false);
  expect(mobileShiftAccess({ permissions: ["ATTENDANCE_SHIFT_PUBLISH"] }).canPublishRoster).toBe(true);
  expect(mobileShiftAccess({ permissions: ["ATTENDANCE_SHIFT_ASSIGN_DEPARTMENT"] }).canViewTeam).toBe(true);
});
test("assignment plans skip duplicates and block all conflicts before saving", () => {
  const existing = [{ employeeId: "e1", assignmentDate: "2026-10-19", dayType: "SHIFT", shiftId: "n" }];
  const plan = planAssignments([employee], existing, [], ["2026-10-19", "2026-10-20"], "SHIFT", "n");
  expect(plan.skipped).toBe(1);
  expect(plan.groups[0].dates).toEqual(["2026-10-20"]);
  expect(() => planAssignments([employee], existing, [], ["2026-10-19"], "HOLIDAY", "")).toThrow("different schedule");
  expect(bulkAssignShift).not.toHaveBeenCalled();
});
test("published department rosters cannot receive new assignments", () => {
  expect(() => planAssignments([employee], [], [{ orgUnitCode: "MACHINING", status: "PUBLISHED" }], ["2026-10-19"], "HOLIDAY", "")).toThrow("locked");
});
test("partial saves are reported and publication is never implicit", async () => {
  ensureShiftRoster.mockResolvedValue({ roster: { _id: "r1" } });
  bulkAssignShift.mockRejectedValue(new Error("Connection lost"));
  await expect(applyAssignmentPlan("2026-10-19", { groups: [{ department: "MACHINING", employeeIds: ["e1"], dates: ["2026-10-19"] }] }, "WEEK_OFF", "")).rejects.toThrow("Some entries may have been saved");
});
test("a failed roster detail fails the load instead of hiding assignments", async () => {
  api.get.mockResolvedValue({ data: { items: [{ _id: "r1" }] } });
  getShiftRosterById.mockRejectedValue(new Error("Detail unavailable"));
  await expect(loadMobileRoster("2026-10-19")).rejects.toThrow("Detail unavailable");
});
test("employee choices include every page and organization metadata", async () => {
  getEmployees.mockImplementation(({ page }) => Promise.resolve({ records: [{ ...employee, _id: `e${page}` }], pagination: { pages: 3 } }));
  getEmployeeMeta.mockResolvedValue({ organizationUnits: [{ code: "CUTTING", name: "Cutting" }] });
  const result = await loadShiftEmployees();
  expect(result.employees).toHaveLength(3);
  expect(result.units[0].code).toBe("CUTTING");
});
