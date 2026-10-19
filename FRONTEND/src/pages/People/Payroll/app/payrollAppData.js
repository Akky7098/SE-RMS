export const idOf = value => String(value?._id || value?.id || value || "");
export const arrayOf = value => Array.isArray(value) ? value : value?.items || value?.records || value?.runs || value?.policies || [];
export const errorOf = error => error?.response?.data?.message || error?.message || "Payroll could not be loaded. Please try again.";
export const monthNow = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
export const money = value => value === undefined || value === null || !Number.isFinite(Number(value)) ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
export const pretty = value => String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
export const dateLabel = value => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
export const employeeName = row => row?.employeeSnapshot?.employeeName || row?.employeeSnapshot?.fullName || row?.employeeName || row?.fullName || "Employee";
export const locked = run => Boolean(run?.locked || ["FINALIZED", "LOCKED"].includes(run?.status));
export function payrollAccess(user, access) {
  // Match the existing Payroll navigation roles. Personal payroll never calls
  // management APIs; these UI gates do not replace server authorization.
  const roles = ["SUPER_ADMIN", "ADMIN", "HEAD", "MANAGER"];
  return { management: [user?.systemRole, user?.role].some(role => roles.includes(String(role || "").toUpperCase())) || Boolean(access?.globalSuperAdmin || access?.fullAccess) };
}
export function runActions(run) {
  if (!run || locked(run)) return [];
  return ({ DRAFT: ["generate"], GENERATED: ["generate", "submit"], UNDER_REVIEW: ["approve"], APPROVED: ["finalize"] })[run.status] || [];
}
export const actionLabels = { generate: "Generate payroll", submit: "Submit for review", approve: "Approve payroll", finalize: "Finalize & lock" };
export const companyOptions = [
  ["SANDEEP_EDGETECH", "Sandeep Edge Tech"], ["SANDEEP_ENTERPRISES", "Sandeep Enterprises"], ["VANIJA", "Vanija"], ["VESS", "VESS"], ["SI", "SI"], ["FERMECH", "Fermech"], ["SF", "SF"], ["MULTIPACK", "Multipack"],
];
export function componentRows(source) {
  if (Array.isArray(source)) return source.map((item, index) => ({ key: item.code || index, label: item.name || pretty(item.code), amount: item.amount }));
  return Object.entries(source || {}).filter(([, value]) => typeof value === "number").map(([key, amount]) => ({ key, label: pretty(key.replace(/([a-z])([A-Z])/g, "$1 $2")), amount }));
}
