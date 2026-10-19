import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PayrollRecordApp from "./PayrollRecordApp";
import { getEmployeePayroll, reviewEmployeePayroll } from "../../../../services/payrollService";
jest.mock("../../../../services/payrollService", () => ({ getEmployeePayroll: jest.fn(), reviewEmployeePayroll: jest.fn() }));
const record = { _id: "ep1", employeeId: "e1", payrollMonth: "2026-10", employeeSnapshot: { employeeName: "Demo Employee" }, money: { netPay: 20000, grossEarnings: 22000, totalDeductions: 2000, earnings: [{ name: "Basic", amount: 22000 }], deductions: [{ name: "PF", amount: 2000 }] }, attendanceSnapshot: { detectedOvertimeMinutes: 60, approvedOvertimeMinutes: 20 }, exceptions: [] };
beforeEach(() => { jest.clearAllMocks(); getEmployeePayroll.mockResolvedValue(record); reviewEmployeePayroll.mockResolvedValue(record); });
test("employee review uses employee-payroll ID and explicit overtime confirmation", async () => {
  render(<PayrollRecordApp recordId="ep1" run={{ _id: "r1", status: "GENERATED" }} onClose={jest.fn()} onSaved={jest.fn()} />);
  await screen.findByText("Demo Employee");
  expect(getEmployeePayroll).toHaveBeenCalledWith("ep1");
  fireEvent.change(screen.getByLabelText("Approved overtime minutes"), { target: { value: "30" } });
  fireEvent.click(screen.getByRole("button", { name: "Review overtime" }));
  expect(reviewEmployeePayroll).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm overtime review" }));
  await waitFor(() => expect(reviewEmployeePayroll).toHaveBeenCalledWith("ep1", { approvedOvertimeMinutes: 30 }));
});
test("locked payroll and personal payslips have no editing actions", async () => {
  render(<PayrollRecordApp personalRecord={{ ...record, locked: true }} run={{ status: "FINALIZED", locked: true }} onClose={jest.fn()} />);
  expect(screen.queryByRole("button", { name: "Review overtime" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "＋ Adjustment" })).not.toBeInTheDocument();
  expect(getEmployeePayroll).not.toHaveBeenCalled();
});
test("failed details cannot expose stale salary review", async () => {
  getEmployeePayroll.mockRejectedValue(new Error("Not available"));
  render(<PayrollRecordApp recordId="ep1" run={{ status: "GENERATED" }} onClose={jest.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Not available");
  expect(screen.queryByRole("button", { name: "Review overtime" })).not.toBeInTheDocument();
});
test("optional demo employee-payroll preview", async () => {
  if (!process.env.PAYROLL_PREVIEW_DIR) return;
  const fs = require("fs"), path = require("path");
  const { container } = render(<PayrollRecordApp recordId="ep1" run={{ status: "GENERATED" }} onClose={jest.fn()} onSaved={jest.fn()} />);
  await screen.findByText("Demo Employee");
  const css = ["../../Leave/app/LeaveApp.css", "PayrollApp.css"].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  fs.mkdirSync(process.env.PAYROLL_PREVIEW_DIR, { recursive: true });
  fs.writeFileSync(path.join(process.env.PAYROLL_PREVIEW_DIR, "detail.html"), `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-lva se-pya">${container.innerHTML}</main></body></html>`);
});
