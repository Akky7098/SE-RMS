import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EmployeeFormApp from "./EmployeeFormApp";
import { createEmployee, getEmployeeById, getEmployeeMeta, getEmployees, updateEmployee } from "../../../../services/employeeService";

jest.mock("../../../../services/employeeService", () => ({ createEmployee: jest.fn(), getEmployeeById: jest.fn(), getEmployeeMeta: jest.fn(), getEmployees: jest.fn(), updateEmployee: jest.fn() }));
const dept = "123456789012345678901234";
const meta = { departments: [{ _id: dept, name: "Production" }], orgUnits: [{ code: "MACHINING", name: "Machining" }], companies: ["SANDEEP_EDGETECH"], statuses: ["ACTIVE", "INACTIVE"], employmentTypes: ["PERMANENT", "PROBATION"] };
const employee = { _id: "existing", fullName: "Demo Employee", employeeCode: "SE1001", companyCode: "SANDEEP_EDGETECH", orgUnitCode: "MACHINING", department: { _id: dept, name: "Production" }, designation: "Operator", status: "ACTIVE", profilePhotoUrl: "/demo-photo.png" };
beforeEach(() => {
  jest.clearAllMocks();
  getEmployeeMeta.mockResolvedValue(meta);
  getEmployees.mockResolvedValue({ records: [employee], pagination: { pages: 1 } });
  getEmployeeById.mockResolvedValue(employee);
  createEmployee.mockResolvedValue({ _id: "created" });
  updateEmployee.mockResolvedValue(employee);
});
const fillRequired = async () => {
  await screen.findByRole("textbox", { name: "Full name *" });
  fireEvent.change(screen.getByLabelText("Full name *"), { target: { value: "New Employee" } });
  fireEvent.change(screen.getByLabelText("Company *"), { target: { value: "SANDEEP_EDGETECH" } });
  fireEvent.change(screen.getByLabelText("Organisation unit *"), { target: { value: "MACHINING" } });
  fireEvent.change(screen.getByLabelText("Department *"), { target: { value: dept } });
  fireEvent.change(screen.getByLabelText("Designation *"), { target: { value: "Machine Operator" } });
};
test("auto ID, reporting choices and creation preserve the existing payload", async () => {
  const onSaved = jest.fn();
  render(<EmployeeFormApp onClose={jest.fn()} onSaved={onSaved} />);
  await fillRequired();
  expect(screen.getByLabelText("Employee ID *")).toHaveValue("SE1002");
  expect(screen.getByLabelText("Reporting manager")).toContainHTML("Demo Employee");
  fireEvent.click(screen.getByRole("button", { name: "Create employee" }));
  await waitFor(() => expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({ fullName: "New Employee", employeeCode: "SE1002", department: dept, orgUnitCode: "MACHINING", designation: "Machine Operator", biometricCode: "SE1002" })));
  expect(onSaved).toHaveBeenCalledWith("created");
});
test("required validation focuses the error without sending a request", async () => {
  render(<EmployeeFormApp onClose={jest.fn()} />);
  await screen.findByRole("textbox", { name: "Full name *" });
  fireEvent.click(screen.getByRole("button", { name: "Create employee" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Employee name is required");
  expect(screen.getByRole("alert")).toHaveFocus();
  expect(createEmployee).not.toHaveBeenCalled();
});
test("manual employee IDs remain intact when company suggestions update", async () => {
  render(<EmployeeFormApp onClose={jest.fn()} />);
  await screen.findByRole("textbox", { name: "Full name *" });
  fireEvent.change(screen.getByLabelText("Employee ID *"), { target: { value: "CUSTOM99" } });
  fireEvent.change(screen.getByLabelText("Company *"), { target: { value: "SANDEEP_EDGETECH" } });
  expect(screen.getByLabelText("Employee ID *")).toHaveValue("CUSTOM99");
});
test("edit preserves the existing photo and excludes self from managers", async () => {
  render(<EmployeeFormApp employeeId="existing" onClose={jest.fn()} onSaved={jest.fn()} />);
  await screen.findByRole("textbox", { name: "Full name *" });
  expect(screen.getByLabelText("Reporting manager").querySelectorAll("option")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(updateEmployee).toHaveBeenCalledWith("existing", expect.objectContaining({ profilePhotoUrl: "/demo-photo.png", employeeCode: "SE1001" })));
});
test("form choices include all API pages when suggesting IDs", async () => {
  getEmployees.mockImplementation(({ page }) => Promise.resolve({ records: page === 1 ? [employee] : [{ ...employee, _id: "last", employeeCode: "SE2000", status: "INACTIVE" }], pagination: { pages: 2 } }));
  render(<EmployeeFormApp onClose={jest.fn()} />);
  await fillRequired();
  expect(screen.getByLabelText("Employee ID *")).toHaveValue("SE2001");
});
test("metadata failure blocks incomplete form submission and permits retry", async () => {
  getEmployeeMeta.mockRejectedValueOnce(new Error("Offline"));
  render(<EmployeeFormApp onClose={jest.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  expect(screen.queryByRole("button", { name: "Create employee" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByRole("textbox", { name: "Full name *" });
});
test("optional demo mobile form preview", async () => {
  if (!process.env.EMPLOYEE_PREVIEW_DIR) return;
  const fs = require("fs"), path = require("path");
  fs.mkdirSync(process.env.EMPLOYEE_PREVIEW_DIR, { recursive: true });
  const { container } = render(<EmployeeFormApp onClose={jest.fn()} />);
  await fillRequired();
  container.querySelectorAll("select").forEach(select => [...select.options].forEach(option => {
    if (option.selected) option.setAttribute("selected", "");
    else option.removeAttribute("selected");
  }));
  const css = ["../../../Recruitment/Interviews/app/InterviewsApp.css", "EmployeesApp.css"].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  fs.writeFileSync(path.join(process.env.EMPLOYEE_PREVIEW_DIR, "form.html"), `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body>${container.innerHTML}</body></html>`);
});
