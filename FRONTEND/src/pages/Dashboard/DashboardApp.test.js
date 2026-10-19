import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import DashboardApp from "./DashboardApp";
import { useAuth } from "../../auth/AuthContext";
import { getAppNavigation } from "./appNavigation";

const mockNavigate = jest.fn();
let mockSearch = "";

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: mockSearch }),
}));
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("./DashboardAppWorkspace", () => ({
  __esModule: true,
  default: ({ app, page }) => <div data-testid="workspace">{app}:{page}</div>,
}));

const employeeAuth = {
  user: { role: "EMPLOYEE", displayName: "Demo Employee", email: "employee@example.com" },
  access: {},
  hasModule: () => false,
  logout: jest.fn(),
};
const managementAuth = {
  user: { role: "SUPER_ADMIN", displayName: "Demo Manager", email: "manager@example.com" },
  access: { fullAccess: true },
  hasModule: () => true,
  logout: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = "";
  useAuth.mockReturnValue(employeeAuth);
});

test("employees see self-service tools without management modules", () => {
  render(<DashboardApp />);
  expect(screen.getByText("My Attendance")).toBeInTheDocument();
  expect(screen.getByText("My Leave")).toBeInTheDocument();
  expect(screen.queryByText("Employees")).not.toBeInTheDocument();
  expect(screen.queryByText("Recruitment")).not.toBeInTheDocument();
  expect(screen.queryByText("Payroll")).not.toBeInTheDocument();
  expect(screen.queryByText("Other apps")).not.toBeInTheDocument();
});

test("management opens a module before choosing its tools", () => {
  useAuth.mockReturnValue(managementAuth);
  const { rerender } = render(<DashboardApp />);
  fireEvent.click(screen.getByRole("button", { name: /People Your people/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=people");
  mockSearch = "?app=people";
  rerender(<DashboardApp />);
  expect(screen.getByRole("button", { name: "Payroll" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Onboarding" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=people&page=onboarding");
});

test("employee direct links cannot render management screens", () => {
  mockSearch = "?app=people&page=payroll";
  render(<DashboardApp />);
  expect(screen.getByText("This page isn’t available.")).toBeInTheDocument();
  expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
});

test("permitted attendance links render the existing workspace", () => {
  mockSearch = "?app=people&page=attendance";
  render(<DashboardApp />);
  expect(screen.getByTestId("workspace")).toHaveTextContent("PEOPLE:attendance");
});

test("search only finds permitted tools", () => {
  render(<DashboardApp />);
  fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "payroll" } });
  expect(screen.getByText("No tools found.")).toBeInTheDocument();
});

test("unimplemented Sales tools are disabled", () => {
  useAuth.mockReturnValue(managementAuth);
  mockSearch = "?app=sales";
  render(<DashboardApp />);
  screen.getAllByText("Coming soon").forEach((label) => {
    expect(label.closest("button")).toBeDisabled();
  });
});

test("recruitment permissions distinguish HR membership and department leadership", () => {
  const auth = {
    user: { role: "HEAD" },
    access: { memberships: [{ department: { code: "HR" }, role: "MEMBER" }] },
    hasModule: (module) => module === "RECRUITMENT",
  };
  const recruitment = getAppNavigation(auth).find((app) => app.code === "RECRUITMENT");
  expect(recruitment.items.some((item) => item.code === "HIRING_QUEUE")).toBe(false);
  expect(recruitment.items.some((item) => item.code === "CANDIDATES")).toBe(true);
});

// Optional isolated fixture export for visual QA; never used by the application.
test("exports management and employee preview fixtures when requested", () => {
  if (!process.env.DASHBOARD_PREVIEW_DIR) return;
  const fs = require("fs");
  const path = require("path");
  fs.mkdirSync(process.env.DASHBOARD_PREVIEW_DIR, { recursive: true });
  const css = fs.readFileSync(path.join(__dirname, "DashboardApp.css"), "utf8");
  for (const [name, auth, search] of [
    ["management", managementAuth, ""],
    ["employee", employeeAuth, ""],
    ["people", managementAuth, "?app=people"],
  ]) {
    useAuth.mockReturnValue(auth);
    mockSearch = search;
    const result = render(<DashboardApp />);
    fs.writeFileSync(
      path.join(process.env.DASHBOARD_PREVIEW_DIR, `${name}.html`),
      `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body>${result.container.innerHTML.replace('/se-logo.png', 'http://localhost:3000/se-logo.png')}</body></html>`
    );
    result.unmount();
  }
});

test("interview workspace exposes its mobile header search", () => {
  useAuth.mockReturnValue(managementAuth);
  mockSearch = "?app=recruitment&page=interviews";
  render(<DashboardApp />);
  expect(screen.getByTestId("workspace")).toHaveTextContent("RECRUITMENT:interviews");
  fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  expect(screen.getByRole("searchbox", { name: "Search interviews" })).toBeInTheDocument();
});

test("employees cannot open interview details through a direct link", () => {
  mockSearch = "?app=recruitment&page=interview&id=demo";
  render(<DashboardApp />);
  expect(screen.getByText("This page isn’t available.")).toBeInTheDocument();
  expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
});

test("evaluation workspace has its own header search", () => {
  useAuth.mockReturnValue(managementAuth);
  mockSearch = "?app=recruitment&page=evaluations";
  render(<DashboardApp />);
  expect(screen.getByTestId("workspace")).toHaveTextContent("RECRUITMENT:evaluations");
  fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  expect(screen.getByRole("searchbox", { name: "Search evaluations" })).toBeInTheDocument();
});

test("selected candidates workspace exposes its mobile search", () => {
  useAuth.mockReturnValue(managementAuth);
  mockSearch = "?app=recruitment&page=selections";
  render(<DashboardApp />);
  expect(screen.getByTestId("workspace")).toHaveTextContent("RECRUITMENT:selections");
  fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  expect(screen.getByRole("searchbox", { name: "Search selected candidates" })).toBeInTheDocument();
});

test("management employee directory exposes employee search", () => {
  useAuth.mockReturnValue(managementAuth);
  mockSearch = "?app=people&page=employees";
  render(<DashboardApp />);
  expect(screen.getByTestId("workspace")).toHaveTextContent("PEOPLE:employees");
  fireEvent.click(screen.getByRole("button", { name: "Open search" }));
  expect(screen.getByRole("searchbox", { name: "Search employees" })).toBeInTheDocument();
});

test("employee role cannot open the management employee directory", () => {
  mockSearch = "?app=people&page=employees";
  render(<DashboardApp />);
  expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  expect(screen.getByText("This page isn’t available.")).toBeInTheDocument();
});

test("dashboard launch and resume do not request GPS or display an install button", () => {
  const getCurrentPosition = jest.fn();
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
  render(<DashboardApp />);
  fireEvent(window, new Event("focus"));
  fireEvent(document, new Event("visibilitychange"));
  expect(getCurrentPosition).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /Install SE-ERP/ })).not.toBeInTheDocument();
});
