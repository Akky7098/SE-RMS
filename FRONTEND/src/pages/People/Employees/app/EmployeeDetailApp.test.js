import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EmployeeDetailApp from "./EmployeeDetailApp";
import { getEmployeeById } from "../../../../services/employeeService";
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("../../../../services/employeeService", () => ({ getEmployeeById: jest.fn() }));
const demo = { _id: "demo", fullName: "Demo Employee", designation: "Machine Operator", employeeCode: "SE1001", companyCode: "SANDEEP_EDGETECH", status: "ACTIVE", mobileNumber: "9000000000", officialEmail: "demo@example.com", departmentName: "Production", orgUnitCode: "MACHINING", joiningDate: "2026-04-01", employmentType: "PERMANENT" };
beforeEach(() => { jest.clearAllMocks(); getEmployeeById.mockResolvedValue(demo); });
test("profile retains contact fields and opens the mobile edit flow", async () => {
  const edit = jest.fn();
  render(<div className="se-iva se-ema"><EmployeeDetailApp employeeId="demo" onClose={jest.fn()} onEdit={edit} /></div>);
  await screen.findByRole("heading", { name: "Demo Employee" });
  expect(screen.getByRole("link", { name: "☎ Call" })).toHaveAttribute("href", "tel:9000000000");
  fireEvent.click(screen.getByRole("button", { name: "Edit employee" }));
  expect(edit).toHaveBeenCalledTimes(1);
});
test("empty profile response is an error rather than an endless loading state", async () => {
  getEmployeeById.mockResolvedValue(null);
  render(<EmployeeDetailApp employeeId="demo" onClose={jest.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Employee not found");
});
test("optional profile preview uses demo records", async () => {
  if (!process.env.EMPLOYEE_PREVIEW_DIR) return;
  const fs = require("fs"), path = require("path");
  const { container } = render(<div className="se-iva se-ema"><EmployeeDetailApp employeeId="demo" onClose={jest.fn()} onEdit={jest.fn()} /></div>);
  await screen.findByRole("heading", { name: "Demo Employee" });
  const css = ["../../../Recruitment/Interviews/app/InterviewsApp.css", "EmployeesApp.css"].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  fs.mkdirSync(process.env.EMPLOYEE_PREVIEW_DIR, { recursive: true });
  fs.writeFileSync(path.join(process.env.EMPLOYEE_PREVIEW_DIR, "profile.html"), `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body>${container.innerHTML}</body></html>`);
});
