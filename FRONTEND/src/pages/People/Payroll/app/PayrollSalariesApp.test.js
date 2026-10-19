import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PayrollSalariesApp from "./PayrollSalariesApp";
import { activateSalaryStructure, getEmployeeSalaryHistory } from "../../../../services/payrollService";
jest.mock("../../../../services/payrollService", () => ({ activateSalaryStructure: jest.fn(), getEmployeeSalaryHistory: jest.fn() }));
test("salary activation is separately confirmed after viewing draft history", async () => {
  getEmployeeSalaryHistory.mockResolvedValue([{ _id: "salary1", monthlyGross: 25000, revisionNumber: 2, effectiveFrom: "2026-10-01", status: "DRAFT", earnings: [] }]);
  activateSalaryStructure.mockResolvedValue({});
  const refresh = jest.fn();
  render(<PayrollSalariesApp employees={[{ _id: "e1", fullName: "Demo Employee", companyCode: "SANDEEP_EDGETECH" }]} policies={[{ active: true, companyCode: "SANDEEP_EDGETECH" }]} loading={false} search="" onCreate={jest.fn()} onRefresh={refresh} />);
  fireEvent.click(screen.getByRole("button", { name: "Salary for Demo Employee" }));
  fireEvent.click(await screen.findByRole("button", { name: "Review activation" }));
  expect(activateSalaryStructure).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toHaveTextContent("supersedes existing active salary");
  fireEvent.click(screen.getByRole("button", { name: "Confirm activation" }));
  await waitFor(() => expect(activateSalaryStructure).toHaveBeenCalledWith("salary1"));
  expect(refresh).toHaveBeenCalled();
});
