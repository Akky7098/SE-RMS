// Roster scopes use organization-unit codes; legacy records retain their department fallback.
export const employeeShiftDepartment = (employee = {}) => ({
  value: String(employee.orgUnitCode || employee.orgUnit?.code || employee.departmentCode ||
    employee.department?._id || employee.departmentId || employee.departmentName || ""),
  label: employee.orgUnit?.name || employee.department?.name || employee.departmentName ||
    employee.orgUnitCode || employee.departmentCode || "",
});

export const shiftDepartmentOptions = (employees = [], organizationUnits = []) => {
  const options = new Map();
  employees.forEach((employee) => {
    const { value, label } = employeeShiftDepartment(employee);
    if (value && label) options.set(value, label);
  });
  organizationUnits.forEach((unit) => {
    if (unit.code && unit.name) options.set(String(unit.code), unit.name);
  });
  return [...options].map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
};
