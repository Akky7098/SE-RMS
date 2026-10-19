import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AttendanceApp from "./AttendanceApp";
import { useAuth } from "../../../../auth/AuthContext";
import { getAttendance, getMyAttendance, startWebAttendance, stopWebAttendance } from "../../../../services/attendanceService";
import { todayKey } from "../utils/attendanceHelpers";
jest.mock("../../../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../../services/employeeService", () => ({ getEmployeeMeta: () => Promise.resolve({ departments: [{ _id: "dep1", name: "Production" }] }) }));
jest.mock("../../../../services/attendanceService", () => ({ getAttendance: jest.fn(), getMyAttendance: jest.fn(), startWebAttendance: jest.fn(), stopWebAttendance: jest.fn(), getMyRegularizations: jest.fn().mockResolvedValue([]), getPendingRegularizations: jest.fn().mockResolvedValue([]), downloadMonthlyAttendance: jest.fn() }));
const today = todayKey();
const biometric = { _id: "123456789012345678901234", employeeId: "me", employeeName: "Demo Employee", employeeCode: "SE1001", businessDate: today, primarySource: "BIOMETRIC", workMode: "OFFICE", presenceStatus: "PRESENT", firstInAt: `${today}T04:00:00Z`, departmentId: "dep1" };
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { role: "EMPLOYEE" } });
  getMyAttendance.mockResolvedValue({ items: [biometric] });
  getAttendance.mockResolvedValue({ items: [biometric] });
  startWebAttendance.mockResolvedValue({});
  stopWebAttendance.mockResolvedValue({});
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: jest.fn(callback => callback({ coords: { latitude: 28.9, longitude: 77.1, accuracy: 15 } })) } });
});
test("employees see biometric punches, a date drilldown and no team or manual checkout", async () => {
  render(<AttendanceApp />);
  await screen.findByText("You're checked in");
  expect(screen.queryByRole("button", { name: "Team attendance" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Check out →" })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button", { name: `${today}: Checked in` }));
  expect(screen.getByRole("dialog")).toHaveTextContent("Biometric device");
  expect(getAttendance).not.toHaveBeenCalled();
});
test("WFH check in sends location and does not offer office web check in", async () => {
  getMyAttendance.mockResolvedValue({ items: [] });
  render(<AttendanceApp />);
  const checkIn = await screen.findByRole("button", { name: "Check in →" });
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  fireEvent.click(checkIn);
  await waitFor(() => expect(startWebAttendance).toHaveBeenCalledWith(expect.objectContaining({ workMode: "WFH", latitude: 28.9, longitude: 77.1, accuracyMeters: 15 })));
  expect(screen.queryByRole("radio", { name: "Office" })).not.toBeInTheDocument();
});
test("a location error prevents a check in API call", async () => {
  getMyAttendance.mockResolvedValue({ items: [] });
  navigator.geolocation.getCurrentPosition.mockImplementation((success, failure) => failure({ code: 1 }));
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  render(<AttendanceApp />);
  fireEvent.click(await screen.findByRole("button", { name: "Check in →" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Location access is blocked");
  expect(startWebAttendance).not.toHaveBeenCalled();
  spy.mockRestore();
});
test("WFH checkout requires explicit confirmation and fresh location", async () => {
  getMyAttendance.mockResolvedValue({ items: [{ ...biometric, primarySource: "WEB", workMode: "WFH" }] });
  render(<AttendanceApp />);
  fireEvent.click(await screen.findByRole("button", { name: "Check out →" }));
  expect(stopWebAttendance).not.toHaveBeenCalled();
  expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm check out" }));
  await waitFor(() => expect(stopWebAttendance).toHaveBeenCalledWith({ latitude: 28.9, longitude: 77.1, accuracyMeters: 15 }));
});
test("management opens one employee's full month without daily filters leaking", async () => {
  useAuth.mockReturnValue({ user: { role: "MANAGER" } });
  render(<AttendanceApp />);
  fireEvent.click(screen.getByRole("button", { name: "Team attendance" }));
  fireEvent.click(await screen.findByRole("button", { name: "Open monthly attendance for Demo Employee" }));
  await waitFor(() => expect(getAttendance).toHaveBeenCalledWith(expect.objectContaining({ employeeId: "me", from: `${today.slice(0, 7)}-01` })));
  expect(screen.getByRole("button", { name: /Back to team/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reports" })).not.toBeInTheDocument();
});
test("team cards use fifty per page and bottom sheet filters", async () => {
  useAuth.mockReturnValue({ user: { role: "MANAGER" } });
  getAttendance.mockResolvedValue({ items: Array.from({ length: 51 }, (_, index) => ({ ...biometric, _id: `row${index}`, employeeId: `e${index}`, employeeName: `Employee ${index}` })) });
  render(<AttendanceApp />);
  fireEvent.click(screen.getByRole("button", { name: "Team attendance" }));
  await screen.findByText("51 people");
  expect(screen.getAllByRole("button", { name: /Open monthly attendance/ })).toHaveLength(50);
  fireEvent.click(screen.getByRole("button", { name: "Next ›" }));
  expect(screen.getAllByRole("button", { name: /Open monthly attendance/ })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
  expect(screen.getByRole("dialog", { name: "Filter team attendance" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Attendance status"), { target: { value: "ABSENT" } });
  fireEvent.click(screen.getByRole("button", { name: "Show attendance" }));
  expect(screen.getByText("No attendance matches these filters.")).toBeInTheDocument();
});
test("failed personal load cannot expose check in or false empty calendar days", async () => {
  getMyAttendance.mockRejectedValue(new Error("Connection lost"));
  render(<AttendanceApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost");
  expect(screen.queryByRole("button", { name: "Check in →" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /: No record/ })).not.toBeInTheDocument();
});
test("optional demo-only mobile previews", async () => {
  if (!process.env.ATTENDANCE_PREVIEW_DIR) return;
  const fs = require("fs"), path = require("path");
  fs.mkdirSync(process.env.ATTENDANCE_PREVIEW_DIR, { recursive: true });
  const demoRecords = Array.from({ length: Math.min(Number(today.slice(-2)), 14) }, (_, index) => {
    const date = `${today.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`;
    return { ...biometric, businessDate: date, firstInAt: `${date}T03:30:00Z`, lastOutAt: index === 7 ? null : `${date}T12:00:00Z`, totalWorkingMinutes: 480, presenceStatus: index === 5 ? "ON_LEAVE" : "PRESENT" };
  });
  getMyAttendance.mockImplementation(query => Promise.resolve({ items: query.from === query.to ? [biometric] : [...demoRecords, biometric] }));
  useAuth.mockReturnValue({ user: { role: "SUPER_ADMIN" } });
  getAttendance.mockResolvedValue({ items: [
    { ...biometric, employeeId: "demo1", employeeName: "Arjun Sharma", departmentName: "Production", employeeCode: "SE1001" },
    { ...biometric, employeeId: "demo2", employeeName: "Neha Verma", departmentName: "Sales", employeeCode: "SE1002", primarySource: "WEB", workMode: "WFH" },
    { ...biometric, employeeId: "demo3", employeeName: "Ravi Kumar", departmentName: "Machining", employeeCode: "SE1003", firstInAt: null, presenceStatus: "ABSENT", synthetic: true },
  ] });
  const { container } = render(<AttendanceApp />);
  await screen.findByRole("button", { name: `${today}: Checked in` });
  const css = ["../../../Recruitment/Interviews/app/InterviewsApp.css", "AttendanceApp.css", "../../../Dashboard/DashboardApp.css"].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  const wrap = html => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-app-dashboard se-app-dashboard--workspace"><header class="se-app-dashboard__topbar"><button class="se-app-dashboard__back">‹</button><h1>Attendance</h1><button class="se-app-dashboard__back">⌕</button><button class="se-app-dashboard__avatar">D</button></header><div class="se-app-dashboard__body">${html}</div><nav class="se-app-dashboard__bottom"><button>⌂ Home</button><button aria-current="page">▦ Apps</button><button>♙ Profile</button></nav></main></body></html>`;
  const save = file => {
    container.querySelectorAll("select").forEach(select => [...select.options].forEach(option => { if (option.selected) option.setAttribute("selected", ""); }));
    fs.writeFileSync(path.join(process.env.ATTENDANCE_PREVIEW_DIR, file), wrap(container.innerHTML));
  };
  save("personal.html");
  fireEvent.click(screen.getByRole("button", { name: "Team attendance" }));
  await screen.findByRole("button", { name: "Open monthly attendance for Arjun Sharma" });
  save("team.html");
  fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
  save("filters.html");
});

test.each([["Field visit", "FIELD_VISIT"], ["On duty", "ON_DUTY"]])("%s checks in using GPS without typed visit details", async (label, workMode) => {
  getMyAttendance.mockResolvedValue({ items: [] });
  render(<AttendanceApp />);
  fireEvent.click(await screen.findByRole("radio", { name: label }));
  expect(screen.queryByLabelText("Work purpose")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Work location")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Check in →" }));
  await waitFor(() => expect(startWebAttendance).toHaveBeenCalledWith({ workMode, latitude: 28.9, longitude: 77.1, accuracyMeters: 15 }));
});
