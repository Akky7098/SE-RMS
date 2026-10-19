import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AttendanceRequests from "./AttendanceRequests";
import AttendanceCorrection from "./AttendanceCorrection";
import { approveAttendanceRegularization, getAttendance, getMyRegularizations, getPendingRegularizations, requestAttendanceRegularization } from "../../../../services/attendanceService";
jest.mock("../../../../services/attendanceService", () => ({ approveAttendanceRegularization: jest.fn(), rejectAttendanceRegularization: jest.fn(), getAttendance: jest.fn(), getMyRegularizations: jest.fn(), getPendingRegularizations: jest.fn(), requestAttendanceRegularization: jest.fn() }));
const request = { _id: "request1", employeeId: "emp1", businessDate: "2026-10-14", reason: "Device did not record my checkout", status: "PENDING", type: "MISSING_CHECK_OUT", original: { firstInAt: "2026-10-14T03:30:00Z" }, requested: { lastOutAt: "2026-10-14T12:30:00Z" } };
beforeEach(() => {
  jest.clearAllMocks();
  getMyRegularizations.mockResolvedValue([]);
  getPendingRegularizations.mockResolvedValue([request]);
  getAttendance.mockResolvedValue({ items: [{ employeeId: "emp1", employeeName: "Demo Employee" }] });
  approveAttendanceRegularization.mockResolvedValue({});
  requestAttendanceRegularization.mockResolvedValue({});
});
test("only approvers can open the pending review list", async () => {
  render(<AttendanceRequests canApprove={false} />);
  await screen.findByText("No correction requests");
  expect(screen.queryByRole("button", { name: "To approve" })).not.toBeInTheDocument();
  expect(getPendingRegularizations).not.toHaveBeenCalled();
});
test("approval verifies employee identity and requires a second explicit action", async () => {
  render(<AttendanceRequests canApprove />);
  fireEvent.click(screen.getByRole("button", { name: "To approve" }));
  fireEvent.click(await screen.findByRole("button", { name: "Review & approve" }));
  await screen.findByText("Demo Employee");
  expect(approveAttendanceRegularization).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await waitFor(() => expect(approveAttendanceRegularization).toHaveBeenCalledWith("request1", ""));
});
test("approval remains disabled when the scoped employee cannot be verified", async () => {
  getAttendance.mockRejectedValue(new Error("Forbidden"));
  render(<AttendanceRequests canApprove />);
  fireEvent.click(screen.getByRole("button", { name: "To approve" }));
  fireEvent.click(await screen.findByRole("button", { name: "Review & approve" }));
  await screen.findByText(/Employee could not be verified/);
  expect(screen.getByRole("button", { name: "Confirm approval" })).toBeDisabled();
  expect(approveAttendanceRegularization).not.toHaveBeenCalled();
});
test("correction sends the existing API payload and waits for success", async () => {
  const saved = jest.fn();
  render(<AttendanceCorrection record={{ _id: "123456789012345678901234", businessDate: "2026-10-14", missingCheckOut: true }} onClose={jest.fn()} onSaved={saved} />);
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Forgot checkout" } });
  fireEvent.change(screen.getByLabelText("Correct check out · optional"), { target: { value: "2026-10-14T18:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Send request" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(requestAttendanceRegularization).toHaveBeenCalledWith({ attendanceId: "123456789012345678901234", type: "MISSING_CHECK_OUT", reason: "Forgot checkout", requested: { lastOutAt: new Date("2026-10-14T18:00").toISOString() } });
});
