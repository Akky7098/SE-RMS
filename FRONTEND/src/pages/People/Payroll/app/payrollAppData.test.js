import { componentRows, money, payrollAccess, runActions } from "./payrollAppData";
import { buildPolicyPayload, getPolicyForm } from "./policyAppData";
test("workflow follows backend states and finalized payroll exposes no mutations", () => {
  expect(runActions({ status: "DRAFT" })).toEqual(["generate"]);
  expect(runActions({ status: "GENERATED" })).toEqual(["generate", "submit"]);
  expect(runActions({ status: "UNDER_REVIEW" })).toEqual(["approve"]);
  expect(runActions({ status: "APPROVED" })).toEqual(["finalize"]);
  expect(runActions({ status: "FINALIZED", locked: true })).toEqual([]);
  expect(runActions({ status: "GENERATED", locked: true })).toEqual([]);
});
test("personal access never implies management access", () => {
  expect(payrollAccess({ role: "EMPLOYEE" }).management).toBe(false);
  expect(payrollAccess({ role: "MANAGER" }).management).toBe(true);
  expect(payrollAccess({ role: "SUPER_ADMIN" }).management).toBe(true);
});
test("currency keeps paise and missing values are not represented as zero", () => {
  expect(money(1234.56)).toContain("1,234.56");
  expect(money(undefined)).toBe("—");
  expect(money(0)).toContain("0.00");
  expect(componentRows([{ code: "BASIC", name: "Basic salary", amount: 100 }])[0].amount).toBe(100);
});
test("policy editor preserves attendance, overtime, scope and deductions", () => {
  const policy = { name: "Existing", companyCode: "SANDEEP_EDGETECH", effectiveFromMonth: "2026-01", fixedPayrollDays: 26, applicability: { scopeType: "EMPLOYEES", employeeIds: ["employee1"] }, attendanceRules: { halfDayValue: .5, holidayPayable: false }, overtime: { enabled: true, multiplier: 2 }, statutory: { pf: { enabled: true, amount: 1200 } } };
  const form = getPolicyForm(policy);
  const payload = buildPolicyPayload(form);
  expect(payload.fixedDays).toBe(26);
  expect(payload.applicability.employeeIds).toEqual(["employee1"]);
  expect(payload.attendanceRules.holidayPayable).toBe(false);
  expect(payload.overtime.multiplier).toBe(2);
  expect(payload.statutory.pf.amount).toBe(1200);
});
