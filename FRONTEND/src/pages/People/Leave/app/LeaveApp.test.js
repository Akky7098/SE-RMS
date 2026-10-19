import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LeaveApp from "./LeaveApp";
import { useAuth } from "../../../../auth/AuthContext";
import { getLeaveRegister, getMyLeaveDashboard, getPendingLeaveApprovals } from "../../../../services/leaveService";
import { filterRequests, leaveAccess, leaveDays } from "./leaveAppData";
jest.mock("../../../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../../services/leaveService", () => ({ getMyLeaveDashboard: jest.fn(), getLeaveRegister: jest.fn(), getPendingLeaveApprovals: jest.fn(), getLeaveErrorMessage: error => error.message }));
jest.mock("./LeaveApplyApp", () => ({ __esModule: true, default: () => <div>Mobile leave form</div> }));
jest.mock("./LeaveRequestApp", () => ({ __esModule: true, default: ({ requestId }) => <div>Request details {requestId}</div> }));
const year = new Date().getFullYear();
const type = { _id: "cl", name: "Casual leave", code: "CL", allowHalfDay: true, isPaid: true };
const request = { _id: "req1", requestNumber: "LV-001", employeeId: { _id: "me", fullName: "Demo Employee", employeeCode: "SE1001" }, leaveTypeId: type, fromDate: `${year}-10-19`, toDate: `${year}-10-20`, totalDays: 2, status: "PENDING_APPROVAL" };
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { role: "EMPLOYEE" } });
  getMyLeaveDashboard.mockResolvedValue({ employee: { _id: "me" }, types: [type], balances: [{ _id: "b1", leaveTypeId: type, available: 8, used: 2, pending: 2 }], requests: [request] });
  getLeaveRegister.mockResolvedValue([request]);
  getPendingLeaveApprovals.mockResolvedValue([request]);
});
test("employees get their own balances and apply action without management calls", async () => {
  render(<LeaveApp />);
  await screen.findByRole("button", { name: "View leave LV-001" });
  expect(screen.queryByRole("button", { name: "Team leaves" })).not.toBeInTheDocument();
  expect(getLeaveRegister).not.toHaveBeenCalled();
  expect(getPendingLeaveApprovals).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "＋ Apply leave" }));
  expect(screen.getByText("Mobile leave form")).toBeInTheDocument();
});
test("view permission does not grant approval permission", async () => {
  useAuth.mockReturnValue({ user: { role: "MANAGER", permissions: ["LEAVE_VIEW_TEAM"] } });
  render(<LeaveApp />);
  fireEvent.click(screen.getByRole("button", { name: "Team leaves" }));
  await screen.findByRole("button", { name: "View leave LV-001" });
  expect(screen.queryByRole("button", { name: "To approve" })).not.toBeInTheDocument();
  expect(getLeaveRegister).toHaveBeenCalledWith({ from: `${year}-01-01`, to: `${year}-12-31` });
});
test("management data remains independent when personal data fails", async () => {
  useAuth.mockReturnValue({ user: { systemRole: "SUPER_ADMIN" } });
  getMyLeaveDashboard.mockRejectedValue(new Error("Personal profile unavailable"));
  render(<LeaveApp />);
  fireEvent.click(screen.getByRole("button", { name: "To approve" }));
  await screen.findByRole("button", { name: "View leave LV-001" });
  expect(getPendingLeaveApprovals).toHaveBeenCalledTimes(1);
});
test("lists paginate fifty cards and filters use a bottom dialog", async () => {
  getMyLeaveDashboard.mockResolvedValue({ employee: { _id: "me" }, types: [type], balances: [], requests: Array.from({ length: 51 }, (_, index) => ({ ...request, _id: `r${index}`, requestNumber: `LV-${index}` })) });
  render(<LeaveApp />);
  await screen.findByRole("button", { name: "View leave LV-0" });
  expect(screen.getAllByRole("button", { name: /View leave/ })).toHaveLength(50);
  fireEvent.click(screen.getByRole("button", { name: "Next ›" }));
  expect(screen.getAllByRole("button", { name: /View leave/ })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
  expect(screen.getByRole("dialog", { name: "Filter leaves" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "APPROVED" } });
  fireEvent.click(screen.getByRole("button", { name: "Show leaves" }));
  expect(screen.getByText("No leave requests found")).toBeInTheDocument();
});
test("a load failure blocks applying and provides refresh", async () => {
  getMyLeaveDashboard.mockRejectedValue(new Error("Offline"));
  render(<LeaveApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  expect(screen.getByRole("button", { name: "＋ Apply leave" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "↻ Refresh" })).toBeEnabled();
});
test("duration, access and overlap filters follow supported leave rules", () => {
  expect(leaveDays("2026-12-31", "2027-01-02")).toBe(3);
  expect(leaveDays("2026-10-19", "2026-10-19", "FIRST_HALF")).toBe(.5);
  expect(leaveDays("2026-10-19", "2026-10-20", "FIRST_HALF")).toBe(0);
  expect(leaveAccess({ role: "MANAGER" }).approve).toBe(false);
  expect(leaveAccess({ permissions: ["LEAVE_APPROVE_TEAM"] }).approve).toBe(true);
  expect(filterRequests([request], { from: `${year}-10-20`, to: `${year}-10-22` })).toHaveLength(1);
  expect(filterRequests([request], {}, "SE1001")).toHaveLength(1);
});
test("optional demo-only mobile previews", async () => {
  if (!process.env.LEAVE_PREVIEW_DIR) return;
  const fs = require("fs"), path = require("path");
  fs.mkdirSync(process.env.LEAVE_PREVIEW_DIR, { recursive: true });
  useAuth.mockReturnValue({ user: { systemRole: "SUPER_ADMIN" } });
  const sick = { _id: "sl", name: "Sick leave", code: "SL", isPaid: true };
  getMyLeaveDashboard.mockResolvedValue({ employee: { _id: "me" }, types: [type, sick], balances: [{ _id: "b1", leaveTypeId: type, available: 8, used: 2, pending: 2 }, { _id: "b2", leaveTypeId: sick, available: 6, used: 1, pending: 0 }], requests: [request, { ...request, _id: "r2", requestNumber: "LV-002", leaveTypeId: sick, totalDays: 1, status: "APPROVED" }] });
  const { container } = render(<LeaveApp />);
  await screen.findByRole("button", { name: "View leave LV-001" });
  const css = ["LeaveApp.css", "../../../Dashboard/DashboardApp.css"].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  const wrap = html => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-app-dashboard se-app-dashboard--workspace"><header class="se-app-dashboard__topbar"><button class="se-app-dashboard__back">‹</button><h1>Leave management</h1><button class="se-app-dashboard__back">⌕</button><button class="se-app-dashboard__avatar">D</button></header><div class="se-app-dashboard__body">${html}</div><nav class="se-app-dashboard__bottom"><button>⌂ Home</button><button aria-current="page">▦ Apps</button><button>♙ Profile</button></nav></main></body></html>`;
  const save = name => {
    container.querySelectorAll("select").forEach(select => [...select.options].forEach(option => option.selected && option.setAttribute("selected", "")));
    fs.writeFileSync(path.join(process.env.LEAVE_PREVIEW_DIR, name), wrap(container.innerHTML));
  };
  save("leave.html");
  fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
  save("filters.html");
});
