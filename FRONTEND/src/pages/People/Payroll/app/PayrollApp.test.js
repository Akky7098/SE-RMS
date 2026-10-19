import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PayrollApp from "./PayrollApp";
import { monthNow } from "./payrollAppData";
import { useAuth } from "../../../../auth/AuthContext";
import { finalizePayrollRun, generatePayrollRun, getMyPayroll, getPayrollPolicies, getPayrollRegister, getPayrollRun, getPayrollRuns } from "../../../../services/payrollService";
jest.mock("../../../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../../services/payrollService", () => ({ getPayrollRuns: jest.fn(), getPayrollPolicies: jest.fn(), getPayrollRun: jest.fn(), getPayrollRegister: jest.fn(), getMyPayroll: jest.fn(), generatePayrollRun: jest.fn(), finalizePayrollRun: jest.fn() }));
jest.mock("../../../../services/departmentService", () => ({ getActiveDepartments: jest.fn().mockResolvedValue([]) }));
jest.mock("../../../../services/manpowerService", () => ({ getActiveOffices: jest.fn().mockResolvedValue([]) }));
jest.mock("../../Employees/app/employeeAppData", () => ({ loadEmployeeChoices: jest.fn().mockResolvedValue([]) }));
jest.mock("./PayrollRecordApp", () => ({ __esModule: true, default: ({ recordId, personalRecord }) => <div>Pay detail {recordId || personalRecord?._id}</div> }));
const month = monthNow();
const run = { _id: "run1", payrollMonth: month, companyCode: "SANDEEP_EDGETECH", status: "GENERATED", employeeCount: 51, exceptionCount: 2, totals: { grossEarnings: 1500000, totalDeductions: 100000, netPay: 1400000 } };
const record = { _id: "ep1", employeeId: "e1", payrollMonth: month, employeeSnapshot: { employeeName: "Demo Employee", employeeCode: "SE1001", departmentName: "Production" }, money: { grossEarnings: 30000, totalDeductions: 1800, netPay: 28200 }, status: "CALCULATED" };
beforeEach(() => {
  jest.clearAllMocks(); useAuth.mockReturnValue({ user: { role: "SUPER_ADMIN" } });
  getPayrollRuns.mockResolvedValue([run]); getPayrollRun.mockResolvedValue(run);
  getPayrollPolicies.mockResolvedValue([{ _id: "p1", name: "Company payroll", companyCode: "SANDEEP_EDGETECH", active: true }]);
  getPayrollRegister.mockImplementation((id, params) => Promise.resolve({ items: [{ ...record, _id: `ep${params.page}` }], total: 51, pages: 2 }));
  getMyPayroll.mockResolvedValue({ employee: { fullName: "Demo Employee" }, payslips: [{ ...record, _id: "my1" }] });
  generatePayrollRun.mockResolvedValue(run); finalizePayrollRun.mockResolvedValue({ ...run, status: "FINALIZED" });
});
test("management loads fifty employees per server page and opens the record ID", async () => {
  render(<PayrollApp />);
  fireEvent.click(await screen.findByRole("button", { name: "Pay details for Demo Employee" }));
  expect(screen.getByText("Pay detail ep1")).toBeInTheDocument();
  expect(getPayrollRegister).toHaveBeenCalledWith("run1", expect.objectContaining({ page: 1, limit: 50 }));
});
test("server pagination and status filters request the correct slice", async () => {
  render(<PayrollApp />);
  await screen.findByRole("button", { name: "Pay details for Demo Employee" });
  fireEvent.click(screen.getByRole("button", { name: "Next ›" }));
  await waitFor(() => expect(getPayrollRegister).toHaveBeenLastCalledWith("run1", expect.objectContaining({ page: 2, limit: 50 })));
  await screen.findByRole("button", { name: "Pay details for Demo Employee" });
  fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "EXCEPTION" } });
  fireEvent.click(screen.getByRole("button", { name: "Show employees" }));
  await waitFor(() => expect(getPayrollRegister).toHaveBeenLastCalledWith("run1", expect.objectContaining({ page: 1, status: "EXCEPTION" })));
});
test("regeneration is explicit and rechecks current server status", async () => {
  render(<PayrollApp />);
  fireEvent.click(await screen.findByRole("button", { name: "Regenerate payroll" }));
  expect(generatePayrollRun).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm generate" }));
  await waitFor(() => expect(generatePayrollRun).toHaveBeenCalledWith("run1", {}));
  expect(getPayrollRun.mock.calls.length).toBeGreaterThan(1);
});
test("status changes block a stale destructive regeneration", async () => {
  render(<PayrollApp />);
  fireEvent.click(await screen.findByRole("button", { name: "Regenerate payroll" }));
  getPayrollRun.mockResolvedValue({ ...run, status: "FINALIZED", locked: true });
  fireEvent.click(screen.getByRole("button", { name: "Confirm generate" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("status changed");
  expect(generatePayrollRun).not.toHaveBeenCalled();
});
test("locked payroll exposes no run write actions", async () => {
  getPayrollRun.mockResolvedValue({ ...run, status: "FINALIZED", locked: true });
  render(<PayrollApp />);
  await screen.findByRole("button", { name: "Pay details for Demo Employee" });
  expect(screen.queryByRole("button", { name: "Regenerate payroll" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Finalize & lock" })).not.toBeInTheDocument();
});
test("employees call only their own salary endpoint", async () => {
  useAuth.mockReturnValue({ user: { role: "EMPLOYEE" } });
  render(<PayrollApp />);
  await screen.findByRole("button", { name: `Open my pay ${month}` });
  expect(getPayrollRuns).not.toHaveBeenCalled(); expect(getPayrollRegister).not.toHaveBeenCalled(); expect(getPayrollPolicies).not.toHaveBeenCalled();
});
test("optional demo mobile previews", async () => {
  if (!process.env.PAYROLL_PREVIEW_DIR) return;
  const fs = require("fs"), path = require("path");
  fs.mkdirSync(process.env.PAYROLL_PREVIEW_DIR, { recursive: true });
  getPayrollRegister.mockResolvedValue({ items: [record, { ...record, _id: "ep2", employeeSnapshot: { employeeName: "Demo Employee Two", employeeCode: "SE1002", departmentName: "Quality" }, money: { netPay: 31500 }, exceptions: [{ severity: "BLOCKER", message: "Missing attendance" }], status: "EXCEPTION" }], total: 2, pages: 1 });
  const { container } = render(<PayrollApp />);
  await screen.findByRole("button", { name: "Pay details for Demo Employee" });
  const css = ["../../Leave/app/LeaveApp.css", "PayrollApp.css", "../../../Dashboard/DashboardApp.css"].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  const wrap = html => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-app-dashboard se-app-dashboard--workspace"><header class="se-app-dashboard__topbar"><button class="se-app-dashboard__back">‹</button><h1>Payroll</h1><button class="se-app-dashboard__back">⌕</button><button class="se-app-dashboard__avatar">D</button></header><div class="se-app-dashboard__body">${html}</div><nav class="se-app-dashboard__bottom"><button>⌂ Home</button><button aria-current="page">▦ Apps</button><button>♙ Profile</button></nav></main></body></html>`;
  container.querySelectorAll("select").forEach(select => [...select.options].forEach(option => option.selected && option.setAttribute("selected", "")));
  fs.writeFileSync(path.join(process.env.PAYROLL_PREVIEW_DIR, "payroll.html"), wrap(container.innerHTML));
});
test("finalization requires confirmation and sends the lock reason", async () => {
  getPayrollRun.mockResolvedValue({ ...run, status: "APPROVED" });
  render(<PayrollApp />);
  fireEvent.click(await screen.findByRole("button", { name: "Finalize & lock" }));
  expect(finalizePayrollRun).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm finalize & lock" }));
  await waitFor(() => expect(finalizePayrollRun).toHaveBeenCalledWith("run1", { lockReason: "Payroll finalized" }));
});
