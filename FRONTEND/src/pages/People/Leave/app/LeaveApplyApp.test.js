import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LeaveApplyApp from "./LeaveApplyApp";
import { applyLeave } from "../../../../services/leaveService";
jest.mock("../../../../services/leaveService", () => ({ applyLeave: jest.fn(), getLeaveErrorMessage: error => error.message }));
const types = [{ _id: "cl", name: "Casual leave", isPaid: true, allowHalfDay: true, requiresBalance: true }, { _id: "sl", name: "Sick leave", isPaid: true, allowHalfDay: false }];
const saved = jest.fn();
const renderForm = () => render(<LeaveApplyApp types={types} balances={[{ leaveTypeId: { _id: "cl" }, available: 8 }]} balanceYear={2026} onClose={jest.fn()} onSaved={saved} />);
beforeEach(() => { jest.clearAllMocks(); applyLeave.mockResolvedValue({}); });
const fill = () => {
  fireEvent.change(screen.getByLabelText("Leave type"), { target: { value: "cl" } });
  fireEvent.change(screen.getByLabelText("Why do you need leave?"), { target: { value: "Family function" } });
};
test("applying requires review before any API call", async () => {
  renderForm(); fill();
  fireEvent.click(screen.getByRole("button", { name: "Review leave →" }));
  expect(screen.getByRole("dialog", { name: "Check your leave" })).toBeInTheDocument();
  expect(applyLeave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Send leave request" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(applyLeave).toHaveBeenCalledWith(expect.objectContaining({ leaveTypeId: "cl", reason: "Family function", durationType: "FULL_DAY", source: "WEB" }));
});
test("half-day selection locks the end date and resets when leave type changes", () => {
  renderForm(); fill();
  fireEvent.click(screen.getByRole("radio", { name: "First half" }));
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-10-25" } });
  expect(screen.getByLabelText("To date")).toHaveValue("2026-10-25");
  expect(screen.getByLabelText("To date")).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Leave type"), { target: { value: "sl" } });
  expect(screen.queryByRole("radio", { name: "First half" })).not.toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Full day" })).toBeChecked();
});
test("emergency reason and whitespace reason are validated", () => {
  renderForm(); fill();
  fireEvent.change(screen.getByLabelText("Why do you need leave?"), { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "Review leave →" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Tell us why");
  expect(applyLeave).not.toHaveBeenCalled();
});
test("API policy errors keep entered information and allow retry", async () => {
  applyLeave.mockRejectedValue(new Error("Insufficient leave balance"));
  renderForm(); fill();
  fireEvent.click(screen.getByRole("button", { name: "Review leave →" }));
  fireEvent.click(screen.getByRole("button", { name: "Send leave request" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Insufficient leave balance");
  expect(saved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  expect(screen.getByLabelText("Why do you need leave?")).toHaveValue("Family function");
});
test("optional demo apply preview", () => {
  if (!process.env.LEAVE_PREVIEW_DIR) return;
  const fs = require("fs"), path = require("path");
  const { container } = renderForm(); fill();
  container.querySelectorAll("select").forEach(select => [...select.options].forEach(option => option.selected && option.setAttribute("selected", "")));
  const css = fs.readFileSync(path.join(__dirname, "LeaveApp.css"), "utf8");
  fs.mkdirSync(process.env.LEAVE_PREVIEW_DIR, { recursive: true });
  fs.writeFileSync(path.join(process.env.LEAVE_PREVIEW_DIR, "apply.html"), `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-lva">${container.innerHTML}</main></body></html>`);
});
