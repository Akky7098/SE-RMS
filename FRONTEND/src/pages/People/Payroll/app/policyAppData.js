const currentPayrollMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const createEmptyForm = (companyCode = "") => ({
  name: "",
  companyCode: companyCode || "",
  policyType: "BASE",
  applicabilityScope: "ALL_EMPLOYEES",
  officeCodes: [],
  departmentIds: [],
  employeeIds: [],
  effectiveFromMonth: currentPayrollMonth(),
  effectiveToMonth: "",
  calculationBasis: "CALENDAR_DAYS",
  fixedDays: 30,
  prorateFixedEarnings: true,
  paidLeavePayable: true,
  weekOffPayable: true,
  holidayPayable: true,
  halfDayValue: 0.5,
  absentValue: 0,
  notMarkedValue: 0,
  overtimeEnabled: false,
  overtimeCalculationType: "SALARY_BASED",
  overtimeFixedHourlyRate: "",
  overtimeMultiplier: 1,
  overtimeMinimumMinutes: 0,
  overtimeRoundingMinutes: 0,
  pfEnabled: false,
  pfAmount: "",
  esiEnabled: false,
  esiAmount: "",
  professionalTaxEnabled: false,
  professionalTaxAmount: "",
  tdsEnabled: false,
  tdsAmount: "",
  active: true,
  isDefault: false
});
const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const getPolicyForm = (policy, companyCode) => {
  if (!policy) {
    return createEmptyForm(companyCode);
  }
  const attendance = policy.attendanceRules || policy.attendance || {};
  const overtime = policy.overtime || policy.overtimeRules || {};
  const statutory = policy.statutory || policy.statutoryConfig || {};
  const applicability = policy.applicability || {};
  return {
    name: policy.name || "",
    companyCode: policy.companyCode || companyCode || "",
    policyType: policy.policyType || "BASE",
    applicabilityScope: applicability.scopeType || "ALL_EMPLOYEES",
    officeCodes: Array.isArray(applicability.officeCodes) ? applicability.officeCodes.map(String) : [],
    departmentIds: Array.isArray(applicability.departmentIds) ? applicability.departmentIds.map(item => String(item?._id || item)) : [],
    employeeIds: Array.isArray(applicability.employeeIds) ? applicability.employeeIds.map(item => String(item?._id || item)) : [],
    effectiveFromMonth: policy.effectiveFromMonth || currentPayrollMonth(),
    effectiveToMonth: policy.effectiveToMonth || "",
    calculationBasis: policy.calculationBasis || "CALENDAR_DAYS",
    fixedDays: policy.fixedDays ?? policy.fixedPayrollDays ?? 30,
    prorateFixedEarnings: policy.prorateFixedEarnings ?? true,
    paidLeavePayable: attendance.paidLeavePayable ?? true,
    weekOffPayable: attendance.weekOffPayable ?? true,
    holidayPayable: attendance.holidayPayable ?? true,
    halfDayValue: attendance.halfDayValue ?? 0.5,
    absentValue: attendance.absentValue ?? 0,
    notMarkedValue: attendance.notMarkedValue ?? 0,
    overtimeEnabled: overtime.enabled ?? false,
    overtimeCalculationType: overtime.calculationType || "SALARY_BASED",
    overtimeFixedHourlyRate: overtime.fixedHourlyRate ?? "",
    overtimeMultiplier: overtime.multiplier ?? 1,
    overtimeMinimumMinutes: overtime.minimumMinutes ?? 0,
    overtimeRoundingMinutes: overtime.roundingMinutes ?? 0,
    pfEnabled: statutory.pf?.enabled ?? false,
    pfAmount: statutory.pf?.amount ?? "",
    esiEnabled: statutory.esi?.enabled ?? false,
    esiAmount: statutory.esi?.amount ?? "",
    professionalTaxEnabled: statutory.professionalTax?.enabled ?? false,
    professionalTaxAmount: statutory.professionalTax?.amount ?? "",
    tdsEnabled: statutory.tds?.enabled ?? false,
    tdsAmount: statutory.tds?.amount ?? "",
    active: policy.active ?? true,
    isDefault: policy.isDefault ?? false
  };
};

export { getPolicyForm };
export const buildPolicyPayload = form => ({
  name: form.name.trim(),
  companyCode: form.companyCode,
  policyType: form.policyType,
  applicability: {
    scopeType: form.applicabilityScope,
    officeCodes: form.applicabilityScope === "OFFICE" ? form.officeCodes : [],
    departmentIds: form.applicabilityScope === "DEPARTMENT" ? form.departmentIds : [],
    employeeIds: form.applicabilityScope === "EMPLOYEES" ? form.employeeIds : []
  },
  effectiveFromMonth: form.effectiveFromMonth,
  effectiveToMonth: form.effectiveToMonth || null,
  calculationBasis: form.calculationBasis,
  fixedDays: numberValue(form.fixedDays, 30),
  prorateFixedEarnings: Boolean(form.prorateFixedEarnings),
  attendanceRules: {
    paidLeavePayable: Boolean(form.paidLeavePayable),
    weekOffPayable: Boolean(form.weekOffPayable),
    holidayPayable: Boolean(form.holidayPayable),
    halfDayValue: numberValue(form.halfDayValue, 0.5),
    absentValue: numberValue(form.absentValue, 0),
    notMarkedValue: numberValue(form.notMarkedValue, 0)
  },
  overtime: {
    enabled: Boolean(form.overtimeEnabled),
    calculationType: form.overtimeCalculationType,
    fixedHourlyRate: numberValue(form.overtimeFixedHourlyRate, 0),
    multiplier: numberValue(form.overtimeMultiplier, 1),
    minimumMinutes: numberValue(form.overtimeMinimumMinutes, 0),
    roundingMinutes: numberValue(form.overtimeRoundingMinutes, 0)
  },
  statutory: {
    pf: {
      enabled: Boolean(form.pfEnabled),
      amount: numberValue(form.pfAmount, 0)
    },
    esi: {
      enabled: Boolean(form.esiEnabled),
      amount: numberValue(form.esiAmount, 0)
    },
    professionalTax: {
      enabled: Boolean(form.professionalTaxEnabled),
      amount: numberValue(form.professionalTaxAmount, 0)
    },
    tds: {
      enabled: Boolean(form.tdsEnabled),
      amount: numberValue(form.tdsAmount, 0)
    }
  },
  active: Boolean(form.active),
  isDefault: form.policyType === "BASE" ? Boolean(form.isDefault) : false
});
