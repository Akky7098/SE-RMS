import { getEmployees } from "../../../../services/employeeService";

export const employeeId = value => String(value?._id || value?.id || value || "");
export const pretty = value => String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
export const departmentName = employee => employee?.departmentName || employee?.department?.name || pretty(employee?.orgUnitCode) || "—";
export const managerName = employee => employee?.reportingManagerName || employee?.reportsTo?.fullName || employee?.reportsToName || "—";
export const initials = name => String(name || "Employee").trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join("").toUpperCase();
export const formatDate = value => {
  const date = value ? new Date(value) : null;
  return !date || Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(date);
};
export const optionItems = (values, kind = "code") => (Array.isArray(values) ? values : []).map(item => {
  if (typeof item === "string") return { value: kind === "department" && !/^[a-f\d]{24}$/i.test(item) ? "" : item, label: pretty(item) };
  const value = kind === "department" ? item._id || item.id : item.value || item.code || item.companyCode || item.orgUnitCode;
  return { value: String(value || ""), label: item.name || item.label || pretty(value) };
}).filter(item => item.value);

// Complete all pages for ID suggestions and manager choices. Directory itself remains server-paginated.
export async function loadEmployeeChoices() {
  const first = await getEmployees({ page: 1, limit: 100 });
  const records = [...(first?.records || [])];
  const pages = Math.max(1, Number(first?.pagination?.pages) || 1);
  let nextPage = 2;
  await Promise.all(Array.from({ length: Math.min(4, pages - 1) }, async () => {
    while (nextPage <= pages) {
      const result = await getEmployees({ page: nextPage++, limit: 100 });
      if (Array.isArray(result?.records)) records.push(...result.records);
    }
  }));
  return [...new Map(records.map(item => [employeeId(item), item])).values()];
}
