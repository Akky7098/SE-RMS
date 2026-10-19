import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import HiringQueueApp from "./HiringQueueApp";
import * as service from "../../../../services/manpowerService";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../../../../services/manpowerService", () => ({
  getHrHiringQueue: jest.fn(),
  getAvailableHrEmployees: jest.fn(),
  assignHrToRequirement: jest.fn(),
  startManpowerHiring: jest.fn(),
}));

const records = [
  { _id: "one", requestNumber: "MPR-2026-041", positionTitle: "CNC Machine Operator", department: { name: "Production" }, numberOfOpenings: 3, requiredByDate: "2026-11-02", priority: "URGENT", status: "APPROVED", assignedHr: null },
  { _id: "two", requestNumber: "MPR-2026-040", positionTitle: "Quality Inspector", department: { name: "Quality" }, numberOfOpenings: 1, requiredByDate: "2026-11-10", priority: "HIGH", status: "APPROVED", assignedHr: { _id: "hr1", displayName: "Demo HR Owner", email: "hr@example.com" } },
  { _id: "three", requestNumber: "MPR-2026-039", positionTitle: "Accounts Executive", department: { name: "Finance" }, numberOfOpenings: 2, requiredByDate: "2026-11-15", priority: "NORMAL", status: "HIRING_IN_PROGRESS", assignedHr: { _id: "hr2", displayName: "Demo Recruiter" } },
];

beforeEach(() => {
  jest.clearAllMocks();
  service.getHrHiringQueue.mockResolvedValue(records);
  service.getAvailableHrEmployees.mockResolvedValue([{ user: { _id: "hr3", displayName: "Demo HR Colleague", email: "colleague@example.com" } }]);
  service.assignHrToRequirement.mockResolvedValue({ ...records[0], assignedHr: { _id: "hr3" } });
  service.startManpowerHiring.mockResolvedValue({ ...records[1], status: "HIRING_IN_PROGRESS" });
});

test("shows correct actions for unassigned, ready and active hiring cards", async () => {
  render(<HiringQueueApp />);
  await screen.findByText("CNC Machine Operator");
  expect(screen.getByRole("button", { name: "Assign HR" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start hiring" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open workspace →" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=hiring-workspace&id=three&from=hiring");
});

test("filters needs-owner roles and searches HR owners", async () => {
  const { rerender } = render(<HiringQueueApp />);
  await screen.findByText("CNC Machine Operator");
  fireEvent.click(screen.getByRole("button", { name: "Needs owner" }));
  expect(screen.queryByText("Quality Inspector")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "All roles" }));
  rerender(<HiringQueueApp search="hr@example.com" />);
  expect(screen.getByText("Quality Inspector")).toBeInTheDocument();
  expect(screen.queryByText("CNC Machine Operator")).not.toBeInTheDocument();
});

test("assigns the HR user id from a nested team member response", async () => {
  render(<HiringQueueApp />);
  await screen.findByText("CNC Machine Operator");
  fireEvent.click(screen.getByRole("button", { name: "Assign HR" }));
  const choice = await screen.findByRole("radio");
  fireEvent.click(choice);
  fireEvent.click(screen.getByRole("button", { name: "Assign owner" }));
  await waitFor(() => expect(service.assignHrToRequirement).toHaveBeenCalledWith("one", "hr3"));
  expect(await screen.findByRole("status")).toHaveTextContent("HR owner assigned successfully.");
});

test("starting hiring requires confirmation and prevents duplicate submissions", async () => {
  let finish;
  service.startManpowerHiring.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  render(<HiringQueueApp />);
  await screen.findByText("Quality Inspector");
  fireEvent.click(screen.getByRole("button", { name: "Start hiring" }));
  expect(service.startManpowerHiring).not.toHaveBeenCalled();
  const confirm = screen.getByRole("button", { name: "Confirm start hiring" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(service.startManpowerHiring).toHaveBeenCalledTimes(1);
  expect(service.startManpowerHiring).toHaveBeenCalledWith("two");
  finish({ ...records[1], status: "HIRING_IN_PROGRESS" });
  await waitFor(() => expect(screen.getByText("Hiring started successfully.")).toBeInTheDocument());
});

test("start errors keep confirmation available for recovery", async () => {
  service.startManpowerHiring.mockRejectedValue({ response: { data: { message: "Access denied" } } });
  render(<HiringQueueApp />);
  await screen.findByText("Quality Inspector");
  fireEvent.click(screen.getByRole("button", { name: "Start hiring" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm start hiring" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
  expect(screen.getByRole("button", { name: "Confirm start hiring" })).toBeEnabled();
});

test("500 requirements paginate in groups of 50 and filtering resets the page", async () => {
  service.getHrHiringQueue.mockResolvedValue(Array.from({ length: 500 }, (_, index) => ({ ...records[0], _id: `role-${index}`, positionTitle: `Role ${index + 1}` })));
  const { container } = render(<HiringQueueApp />);
  await screen.findByText("Role 1");
  expect(container.querySelectorAll(".se-hqa-card")).toHaveLength(50);
  fireEvent.change(screen.getByLabelText("Go to hiring page"), { target: { value: "10" } });
  expect(screen.getByText("451–500 of 500")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Urgent", exact: true }));
  expect(screen.getByText("1–50 of 500")).toBeInTheDocument();
});

test("queue API failures offer retry", async () => {
  service.getHrHiringQueue.mockRejectedValue(new Error("Unavailable"));
  render(<HiringQueueApp />);
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
});

test("optional preview fixtures contain demo data only", async () => {
  if (!process.env.HIRING_PREVIEW_DIR) return;
  const fs = require("fs");
  const path = require("path");
  fs.mkdirSync(process.env.HIRING_PREVIEW_DIR, { recursive: true });
  const css = fs.readFileSync(path.join(__dirname, "HiringQueueApp.css"), "utf8") + fs.readFileSync(path.join(__dirname, "../../../Dashboard/DashboardApp.css"), "utf8");
  const { container } = render(<HiringQueueApp />);
  await screen.findByText("CNC Machine Operator");
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-app-dashboard se-app-dashboard--workspace"><header class="se-app-dashboard__topbar"><button class="se-app-dashboard__back">‹</button><h1>Hiring Queue</h1><button class="se-app-dashboard__back">⌕</button><button class="se-app-dashboard__avatar">D</button></header><div class="se-app-dashboard__body">${container.innerHTML}</div></main></body></html>`;
  fs.writeFileSync(path.join(process.env.HIRING_PREVIEW_DIR, "queue.html"), html);
});
