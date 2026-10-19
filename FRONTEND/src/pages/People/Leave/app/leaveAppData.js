export const idOf = value => String(value?._id || value?.id || value || "");
export const statuses = {
  PENDING_APPROVAL: "Waiting for approval", APPROVED: "Approved", REJECTED: "Rejected",
  RETURNED: "Returned", CANCEL_REQUESTED: "Cancellation requested", CANCELLED: "Cancelled", AVAILED: "Leave taken",
};
export const durationLabel = value => ({ FULL_DAY: "Full day", FIRST_HALF: "First half", SECOND_HALF: "Second half", HALF_DAY: "Half day" })[value] || value;
export const tone = status => status === "APPROVED" ? "good" : status === "REJECTED" ? "bad" : ["PENDING_APPROVAL", "CANCEL_REQUESTED", "RETURNED"].includes(status) ? "waiting" : "neutral";
export function leaveAccess(user, access) {
  const permissions = new Set([user?.permissions, user?.effectivePermissions, access?.permissions].flatMap(items => Array.isArray(items) ? items : []).filter(item => typeof item === "string"));
  const admin = String(user?.systemRole || user?.role || access?.systemRole || "").toUpperCase() === "SUPER_ADMIN" || Boolean(access?.globalSuperAdmin || access?.superAdmin);
  return {
    admin,
    team: admin || ["LEAVE_VIEW_ALL", "LEAVE_VIEW_TEAM", "LEAVE_VIEW_DEPARTMENT", "LEAVE_APPROVE_TEAM"].some(permission => permissions.has(permission)),
    approve: admin || permissions.has("LEAVE_APPROVE_TEAM"),
    balance: admin || ["LEAVE_MANAGE_POLICY", "LEAVE_MANAGE_BALANCE", "LEAVE_ADJUST_BALANCE"].some(permission => permissions.has(permission)),
  };
}
export function leaveDays(from, to, duration = "FULL_DAY") {
  const first = new Date(`${from}T00:00:00Z`), last = new Date(`${to}T00:00:00Z`);
  if (!from || !to || !Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || last < first) return 0;
  if (["FIRST_HALF", "SECOND_HALF", "HALF_DAY"].includes(duration)) return from === to ? 0.5 : 0;
  return Math.round((last - first) / 86400000) + 1;
}
export function filterRequests(rows, { status = "", type = "", from = "", to = "", employee = "" }, search = "") {
  const needle = search.trim().toLowerCase();
  return rows.filter(row => {
    if (status && row.status !== status) return false;
    if (type && idOf(row.leaveTypeId) !== type) return false;
    if (employee && idOf(row.employeeId) !== employee) return false;
    if (from && String(row.toDate).slice(0, 10) < from) return false;
    if (to && String(row.fromDate).slice(0, 10) > to) return false;
    return !needle || [row.requestNumber, row.employeeId?.fullName, row.employeeId?.employeeCode, row.employeeId?.orgUnitCode, row.leaveTypeId?.name, row.leaveTypeId?.code].join(" ").toLowerCase().includes(needle);
  });
}
