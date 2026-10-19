import api from "../../../../../services/api";
import { getEmployeeMeta, getEmployees } from "../../../../../services/employeeService";
import { bulkAssignShift, ensureShiftRoster, getShiftRosterById } from "../../../../../services/shiftService";
import { getShiftAccess } from "../utils/shiftAccess";
import { employeeShiftDepartment } from "../utils/shiftDepartments";
import { shiftTiming } from "../utils/shiftHelpers";
export const idOf = value => String(value?._id || value?.id || value || "");
export const errorOf = failure => failure?.response?.data?.message || failure?.message || "Could not load shifts. Please try again.";
export const keyOf = assignment => `${idOf(assignment.employeeId)}:${assignment.assignmentDate}`;
export function mobileShiftAccess(user, access) {
  const base = getShiftAccess(user, access);
  const permissions = new Set([...(Array.isArray(user?.permissions) ? user.permissions : []), ...(Array.isArray(access?.permissions) ? access.permissions : [])]);
  const admin = String(user?.role || "").toUpperCase() === "ADMIN";
  const manage = base.canManageRoster || admin || permissions.has("ATTENDANCE_SHIFT_ASSIGN_DEPARTMENT");
  return { ...base, canViewTeam: base.canViewTeam || manage || base.canManageShiftMaster || permissions.has("ATTENDANCE_SHIFT_MANAGE") || permissions.has("ATTENDANCE_SHIFT_PUBLISH"), canManageRoster: manage,
    canPublishRoster: base.canPublishRoster || admin || permissions.has("ATTENDANCE_MANAGE_SHIFT") || permissions.has("ATTENDANCE_SHIFT_PUBLISH"),
    canManageShiftMaster: base.canManageShiftMaster || admin || permissions.has("ATTENDANCE_SHIFT_MANAGE") };
}
export function scheduleOf(assignment, shifts) {
  if (!assignment) return { title: "Normal day shift", timing: "Regular working schedule", tone: "day" };
  if (assignment.dayType !== "SHIFT") return { title: ({ WEEK_OFF: "Week off", HOLIDAY: "Holiday", LEAVE: "Leave", NOT_SCHEDULED: "Not scheduled" })[assignment.dayType] || assignment.dayType, timing: "", tone: "off" };
  const shift = shifts.find(item => idOf(item) === idOf(assignment.shiftId)) || (typeof assignment.shiftId === "object" ? assignment.shiftId : null);
  return { title: shift?.name || assignment.shiftName || "Assigned shift", timing: shiftTiming(shift), tone: shift?.type === "NIGHT" || shift?.crossesMidnight ? "night" : "day", overnight: Boolean(shift?.crossesMidnight) };
}
export async function loadShiftEmployees() {
  const first = await getEmployees({ status: "ACTIVE", page: 1, limit: 100 });
  const records = [...(first.records || first.items || [])];
  const pages = Number(first.pagination?.pages || first.pagination?.totalPages || 1);
  let next = 2;
  await Promise.all(Array.from({ length: Math.min(4, pages - 1) }, async () => {
    while (next <= pages) {
      const result = await getEmployees({ status: "ACTIVE", page: next++, limit: 100 });
      records.push(...(result.records || result.items || []));
    }
  }));
  let units = [];
  try { const meta = await getEmployeeMeta(); units = meta.organizationUnits || meta.orgUnits || []; } catch (_) { /* Employee-backed departments remain available. */ }
  return { employees: [...new Map(records.map(employee => [idOf(employee), employee])).values()], units };
}
// Load every roster detail strictly. A missing detail must not look like an
// empty schedule and allow an accidental conflicting assignment.
export async function loadMobileRoster(weekStart) {
  const response = await api.get("/attendance/shifts/rosters", { params: { weekStart, limit: 200 } });
  const data = response?.data?.data || response?.data || {};
  if (data.roster && Array.isArray(data.assignments)) return { rosters: [data.roster], assignments: data.assignments, employees: data.employees || [] };
  const rosters = Array.isArray(data) ? data : data.rosters || data.records || data.items || [];
  if (rosters.length >= 200) throw new Error("This week has too many rosters to load safely. Narrow the scope before assigning shifts.");
  const details = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, rosters.length) }, async () => {
    while (next < rosters.length) {
      const detail = await getShiftRosterById(rosters[next++]._id);
      if (!detail?.roster?._id || !Array.isArray(detail.assignments)) throw new Error("Roster details are incomplete. Refresh before assigning shifts.");
      details.push(detail);
    }
  }));
  return { rosters: rosters.map(roster => ({ ...roster, ...details.find(detail => idOf(detail.roster) === idOf(roster))?.roster })), assignments: details.flatMap(item => item.assignments || []), employees: details.flatMap(item => item.employees || []) };
}
export function planAssignments(employees, assignments, rosters, dates, dayType, shiftId) {
  const existing = new Map(assignments.map(item => [keyOf(item), item]));
  const groups = new Map();
  let skipped = 0;
  for (const employee of employees) {
    const department = employeeShiftDepartment(employee).value;
    if (!department) throw new Error(`${employee.fullName} has no department. Update their employee record first.`);
    const target = rosters.find(roster => (String(roster.orgUnitCode || roster.departmentCode || "").toUpperCase() === department.toUpperCase() || idOf(roster.departmentId) === department));
    if (["PUBLISHED", "CANCELLED"].includes(target?.status)) throw new Error(`${department} is locked. Published schedules cannot be changed.`);
    const fresh = [];
    for (const date of dates) {
      const previous = existing.get(`${idOf(employee)}:${date}`);
      if (!previous) { fresh.push(date); continue; }
      if (previous.dayType === dayType && (dayType !== "SHIFT" || idOf(previous.shiftId) === shiftId)) { skipped++; continue; }
      throw new Error(`${employee.fullName} already has a different schedule on ${date}. Open their weekly schedule to edit it.`);
    }
    if (!fresh.length) continue;
    const key = `${department}:${fresh.join(",")}`;
    if (!groups.has(key)) groups.set(key, { department, dates: fresh, employeeIds: [] });
    groups.get(key).employeeIds.push(idOf(employee));
  }
  return { groups: [...groups.values()], skipped };
}
export async function applyAssignmentPlan(weekStart, plan, dayType, shiftId) {
  let saved = 0;
  try {
    for (const group of plan.groups) {
      const response = await ensureShiftRoster({ weekStart, department: group.department });
      const roster = response.roster || response;
      if (!roster._id) throw new Error("Weekly roster could not be resolved.");
      await bulkAssignShift(roster._id, { employeeIds: group.employeeIds, dates: group.dates, dayType, shiftId: dayType === "SHIFT" ? shiftId : null });
      saved += group.employeeIds.length * group.dates.length;
    }
    return saved;
  } catch (failure) {
    throw new Error(`${errorOf(failure)} Some entries may have been saved${saved ? ` (${saved} confirmed)` : ""}. Close this form and refresh before retrying.`);
  }
}

export const departmentName = (employee, units = []) => {
  const department = employeeShiftDepartment(employee);
  return units.find(unit => String(unit.code) === department.value)?.name || department.label;
};
