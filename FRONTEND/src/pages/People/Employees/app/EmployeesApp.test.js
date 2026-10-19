import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EmployeesApp from "./EmployeesApp";
import { getEmployees, getEmployeeMeta } from "../../../../services/employeeService";

jest.mock("../../../../services/employeeService", () => ({ getEmployees: jest.fn(), getEmployeeMeta: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("./EmployeeFormApp", () => ({ __esModule: true, default: ({ onClose }) => <div><h2>Mobile employee form</h2><button onClick={onClose}>Close demo form</button></div> }));
jest.mock("./EmployeeDetailApp", () => ({ __esModule: true, default: ({ employeeId, onClose }) => <div><h2>Profile {employeeId}</h2><button onClick={onClose}>Close demo profile</button></div> }));
const departmentId = "123456789012345678901234";
const demo = [
  { _id: "one", fullName: "Demo Employee One", employeeCode: "SE1001", companyCode: "SANDEEP_EDGETECH", designation: "Machine Operator", orgUnitCode: "MACHINING", department: { _id: departmentId, name: "Production" }, mobileNumber: "9000000001", status: "ACTIVE", reportingManagerName: "Demo Manager" },
  { _id: "two", fullName: "Demo Employee Two", employeeCode: "SE1002", companyCode: "SANDEEP_EDGETECH", designation: "Quality Inspector", orgUnitCode: "QUALITY", status: "NOTICE_PERIOD" },
];
const meta = { departments: [{ _id: departmentId, name: "Production" }], orgUnits: [{ code: "MACHINING", name: "Machining" }, { code: "CUTTING", name: "Cutting" }], companies: ["SANDEEP_EDGETECH"], statuses: ["ACTIVE", "INACTIVE", "NOTICE_PERIOD"] };
beforeEach(() => {
  jest.clearAllMocks();
  getEmployees.mockResolvedValue({ records: demo, pagination: { page: 1, limit: 50, total: 2, pages: 1 } });
  getEmployeeMeta.mockResolvedValue(meta);
});
test("directory shows employee identity and opens a mobile profile without losing the list", async () => {
  render(<EmployeesApp />);
  await screen.findByText("Demo Employee One");
  expect(screen.getByRole("link", { name: "Call Demo Employee One" })).toHaveAttribute("href", "tel:9000000001");
  fireEvent.click(screen.getByRole("button", { name: "View Demo Employee One" }));
  expect(screen.getByText("Profile one")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Close demo profile"));
  expect(screen.getByText("Demo Employee One")).toBeInTheDocument();
  expect(getEmployees).toHaveBeenCalledTimes(1);
});
test("filters send department, company, unit and status to the API", async () => {
  render(<EmployeesApp />);
  await screen.findByText("Demo Employee One");
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  fireEvent.click(screen.getByRole("radio", { name: "Active" }));
  fireEvent.change(screen.getByLabelText("Department"), { target: { value: departmentId } });
  fireEvent.change(screen.getByLabelText("Company"), { target: { value: "SANDEEP_EDGETECH" } });
  fireEvent.change(screen.getByLabelText("Organisation unit"), { target: { value: "CUTTING" } });
  fireEvent.click(screen.getByRole("button", { name: "Show employees" }));
  await waitFor(() => expect(getEmployees).toHaveBeenLastCalledWith({ page: 1, limit: 50, status: "ACTIVE", department: departmentId, companyCode: "SANDEEP_EDGETECH", orgUnitCode: "CUTTING" }));
});
test("server pagination requests fifty records and search resets to page one", async () => {
  getEmployees.mockImplementation(params => Promise.resolve({ records: demo, pagination: { page: params.page, limit: 50, total: 500, pages: 10 } }));
  const { rerender } = render(<EmployeesApp />);
  await screen.findByText("Demo Employee One");
  fireEvent.change(screen.getByLabelText("Go to employee page"), { target: { value: "10" } });
  await waitFor(() => expect(getEmployees).toHaveBeenLastCalledWith({ page: 10, limit: 50 }));
  rerender(<EmployeesApp search="SE1001" />);
  await waitFor(() => expect(getEmployees).toHaveBeenLastCalledWith({ page: 1, limit: 50, search: "SE1001" }));
});
test("Add employee opens the app form and Cancel preserves the directory", async () => {
  render(<EmployeesApp />);
  await screen.findByText("Demo Employee One");
  fireEvent.click(screen.getByRole("button", { name: "+ Add employee" }));
  expect(screen.getByText("Mobile employee form")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Close demo form"));
  expect(screen.getByText("Demo Employee One")).toBeInTheDocument();
});
test("failed requests remain retryable", async () => {
  getEmployees.mockRejectedValue(new Error("Offline"));
  render(<EmployeesApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});
test("optional demo list and filter previews", async () => {
  if (!process.env.EMPLOYEE_PREVIEW_DIR) return;
  const fs = require("fs"), path = require("path");
  fs.mkdirSync(process.env.EMPLOYEE_PREVIEW_DIR, { recursive: true });
  const { container } = render(<EmployeesApp />);
  await screen.findByText("Demo Employee One");
  const css = ["../../../Recruitment/Interviews/app/InterviewsApp.css", "EmployeesApp.css", "../../../Dashboard/DashboardApp.css"].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  const wrap = html => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-app-dashboard se-app-dashboard--workspace"><header class="se-app-dashboard__topbar"><button class="se-app-dashboard__back">‹</button><h1>Employees</h1><button class="se-app-dashboard__back">⌕</button><button class="se-app-dashboard__avatar">D</button></header><div class="se-app-dashboard__body">${html}</div></main></body></html>`;
  fs.writeFileSync(path.join(process.env.EMPLOYEE_PREVIEW_DIR, "employees.html"), wrap(container.innerHTML));
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  fs.writeFileSync(path.join(process.env.EMPLOYEE_PREVIEW_DIR, "filters.html"), wrap(container.innerHTML));
});
