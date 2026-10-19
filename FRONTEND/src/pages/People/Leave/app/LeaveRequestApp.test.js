import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LeaveRequestApp from "./LeaveRequestApp";
import { approveLeave, cancelLeave, getLeaveRequest, rejectLeave } from "../../../../services/leaveService";
jest.mock("../../../../services/leaveService", () => ({ approveLeave: jest.fn(), cancelLeave: jest.fn(), getLeaveRequest: jest.fn(), rejectLeave: jest.fn(), getLeaveErrorMessage: error => error.message }));
const request = { _id: "req1", employeeId: { _id: "employee1", fullName: "Demo Employee", employeeCode: "SE1001" }, leaveTypeId: { _id: "cl", name: "Casual leave" }, currentApproverEmployeeId: { _id: "manager1", fullName: "Demo Manager" }, fromDate: "2026-10-19", toDate: "2026-10-20", totalDays: 2, reason: "Family function", status: "PENDING_APPROVAL" };
const saved = jest.fn();
const show = (props = {}) => render(<LeaveRequestApp requestId="req1" employeeId="manager1" access={{ approve: true, admin: false }} ownIds={[]} onClose={jest.fn()} onSaved={saved} {...props} />);
beforeEach(() => {
  jest.clearAllMocks();
  getLeaveRequest.mockResolvedValue(request);
  approveLeave.mockResolvedValue({});
  rejectLeave.mockResolvedValue({});
  cancelLeave.mockResolvedValue({ status: "CANCEL_REQUESTED" });
});
test("only the assigned approver can see decision actions", async () => {
  show({ employeeId: "different-manager" });
  await screen.findByText("Demo Employee");
  expect(screen.queryByRole("button", { name: "Approve leave" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel leave" })).not.toBeInTheDocument();
});
test("approval needs a review and explicit confirmation", async () => {
  show();
  fireEvent.click(await screen.findByRole("button", { name: "Approve leave" }));
  expect(approveLeave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await waitFor(() => expect(approveLeave).toHaveBeenCalledWith("req1", ""));
  expect(saved).toHaveBeenCalledWith("Leave approved.");
});
test("rejection rejects blank comments", async () => {
  show();
  fireEvent.click(await screen.findByRole("button", { name: "Reject" }));
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "  " } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm rejection" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a reason");
  expect(rejectLeave).not.toHaveBeenCalled();
});
test("approved leave cancellation is shown as a request rather than immediate cancellation", async () => {
  getLeaveRequest.mockResolvedValue({ ...request, status: "APPROVED" });
  show({ employeeId: "employee1", access: { approve: false }, ownIds: ["req1"] });
  fireEvent.click(await screen.findByRole("button", { name: "Cancel leave" }));
  expect(screen.getByText(/stays active until/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Plans changed" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm cancellation" }));
  await waitFor(() => expect(cancelLeave).toHaveBeenCalledWith("req1", "Plans changed"));
  expect(saved).toHaveBeenCalledWith("Cancellation request sent for approval.");
});
test("detail errors cannot expose stale approval actions", async () => {
  getLeaveRequest.mockRejectedValue(new Error("Forbidden"));
  show();
  expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden");
  expect(screen.queryByRole("button", { name: "Approve leave" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});
