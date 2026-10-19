import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManpowerApp from "./ManpowerApp";
import ManpowerAppForm from "./ManpowerAppForm";
import ManpowerAppDetail from "./ManpowerAppDetail";
import { buildManpowerPayload, EMPTY_FORM } from "./manpowerAppHelpers";
import api from "../../../../services/api";
import * as service from "../../../../services/manpowerService";

const mockNavigate = jest.fn();
let mockSearch = "?app=recruitment&page=manpower";
jest.mock("react-router-dom", () => ({
  useLocation: () => ({ search: mockSearch }),
  useNavigate: () => mockNavigate,
}));
jest.mock("../../../../auth/AuthContext", () => ({
  useAuth: () => ({ user: { _id: "me", role: "HEAD" } }),
}));
jest.mock("../../../../services/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("../../../../services/manpowerService", () => ({
  getManpowerRequirements: jest.fn(),
  getManpowerApprovalInbox: jest.fn(),
  getManpowerRequirement: jest.fn(),
  createManpowerRequirement: jest.fn(),
  getActiveOffices: jest.fn(),
  approveManpowerRequirement: jest.fn(),
  rejectManpowerRequirement: jest.fn(),
}));

const requests = [
  { _id: "r1", requestNumber: "MPR-2026-041", positionTitle: "CNC Machine Operator", department: { name: "Production" }, numberOfOpenings: 3, priority: "URGENT", status: "PENDING_APPROVAL", location: "Plant 1", requiredByDate: "2026-11-02", requestedBy: { _id: "other", displayName: "Demo Requester" }, reason: "Additional capacity for the new production line.", employmentType: "FULL_TIME", minimumExperienceYears: 2, maximumExperienceYears: 5, budgetMin: 240000, budgetMax: 360000 },
  { _id: "r2", requestNumber: "MPR-2026-040", positionTitle: "Quality Inspector", department: { name: "Quality" }, numberOfOpenings: 1, priority: "HIGH", status: "HIRING_IN_PROGRESS", location: "Plant 2", requiredByDate: "2026-11-10", requestedBy: { _id: "me" } },
  { _id: "r3", requestNumber: "MPR-2026-039", positionTitle: "Accounts Executive", department: { name: "Finance" }, numberOfOpenings: 2, priority: "NORMAL", status: "APPROVED", location: "Head Office", requiredByDate: "2026-11-15", requestedBy: { _id: "other" } },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = "?app=recruitment&page=manpower";
  service.getManpowerRequirements.mockResolvedValue({ records: requests });
  service.getManpowerApprovalInbox.mockResolvedValue([requests[0]]);
  service.getManpowerRequirement.mockResolvedValue(requests[0]);
  service.getActiveOffices.mockResolvedValue([{ _id: "o1", name: "Plant 1" }]);
  api.get.mockResolvedValue({ data: { data: { departments: [{ _id: "d1", name: "Production", status: "ACTIVE" }] } } });
});

const fill = (name, value) => fireEvent.change(screen.getByLabelText(name), { target: { value } });

async function fillPosition() {
  await screen.findByRole("option", { name: "Production" });
  fill("Position title *", "CNC Operator");
  fill("Department *", "d1");
  fill("Required by *", "2099-01-02");
  fill("Work location *", "o1");
  fill("Business reason *", "New production line capacity.");
}

test("mobile register filters status, mine, approvals and search", async () => {
  const { rerender } = render(<ManpowerApp />);
  await screen.findByText("CNC Machine Operator");
  fireEvent.click(screen.getByRole("button", { name: "My requests" }));
  expect(screen.getByText("Quality Inspector")).toBeInTheDocument();
  expect(screen.queryByText("CNC Machine Operator")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "All requests" }));
  fireEvent.click(screen.getByRole("button", { name: "Approved" }));
  expect(screen.getByText("Accounts Executive")).toBeInTheDocument();
  expect(screen.queryByText("Quality Inspector")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "All", exact: true }));
  rerender(<ManpowerApp search="CNC" />);
  expect(screen.getByText("CNC Machine Operator")).toBeInTheDocument();
  expect(screen.queryByText("Accounts Executive")).not.toBeInTheDocument();
});

test("request creation opens the mobile form route", async () => {
  render(<ManpowerApp />);
  await screen.findByText("CNC Machine Operator");
  fireEvent.click(screen.getByRole("button", { name: "+ Raise request" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=manpower&create=true");
});

test("form validates before moving on and preserves the annual budget API contract", async () => {
  service.createManpowerRequirement.mockResolvedValue({ _id: "new" });
  const onCreated = jest.fn();
  render(<ManpowerAppForm onCreated={onCreated} onCancel={jest.fn()} />);
  await screen.findByRole("option", { name: "Production" });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText("Position title is required.")).toBeInTheDocument();
  await fillPosition();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fill("Minimum salary", "20000"); fill("Maximum salary", "30000");
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ _id: "new" }));
  expect(service.createManpowerRequirement).toHaveBeenCalledWith(expect.objectContaining({ budgetMin: 240000, budgetMax: 360000, location: "Plant 1", department: "d1" }));
});

test("approval actions are hidden for own requests even if the inbox includes them", async () => {
  service.getManpowerRequirement.mockResolvedValue({ ...requests[0], requestedBy: { _id: "me" } });
  render(<ManpowerAppDetail id="r1" userId="me" approvalIds={new Set(["r1"])} onChanged={jest.fn()} onBack={jest.fn()} />);
  await screen.findByText("CNC Machine Operator");
  expect(screen.queryByRole("button", { name: "Approve", exact: true })).not.toBeInTheDocument();
});

test("authorized approval requires confirmation and calls the existing endpoint", async () => {
  service.approveManpowerRequirement.mockResolvedValue({ ...requests[0], status: "APPROVED" });
  render(<ManpowerAppDetail id="r1" userId="me" approvalIds={new Set(["r1"])} onChanged={jest.fn()} onBack={jest.fn()} />);
  await screen.findByText("CNC Machine Operator");
  fireEvent.click(screen.getByRole("button", { name: "Approve", exact: true }));
  expect(service.approveManpowerRequirement).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  await waitFor(() => expect(service.approveManpowerRequirement).toHaveBeenCalledWith("r1", { remarks: "" }));
});

test("request load failure offers a retry", async () => {
  service.getManpowerRequirements.mockRejectedValue(new Error("Offline"));
  render(<ManpowerApp />);
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});

test("payload refuses an unavailable work location", () => {
  expect(() => buildManpowerPayload({ ...EMPTY_FORM, officeId: "missing" }, [])).toThrow("available work location");
});

test("optional visual fixtures use demo data only", async () => {
  if (!process.env.MANPOWER_PREVIEW_DIR) return;
  const fs = require("fs");
  const path = require("path");
  fs.mkdirSync(process.env.MANPOWER_PREVIEW_DIR, { recursive: true });
  const css = fs.readFileSync(path.join(__dirname, "ManpowerApp.css"), "utf8") + fs.readFileSync(path.join(__dirname, "../../../Dashboard/DashboardApp.css"), "utf8");
  const save = (name, content) => fs.writeFileSync(path.join(process.env.MANPOWER_PREVIEW_DIR, `${name}.html`), `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-app-dashboard se-app-dashboard--workspace"><header class="se-app-dashboard__topbar"><button class="se-app-dashboard__back">‹</button><h1>Manpower Requests</h1><button class="se-app-dashboard__back">⌕</button><button class="se-app-dashboard__avatar">D</button></header><div class="se-app-dashboard__body">${content}</div></main></body></html>`);
  let result = render(<ManpowerApp />);
  await screen.findByText("CNC Machine Operator");
  save("register", result.container.innerHTML);
  result.unmount();
  result = render(<div className="se-mpa"><ManpowerAppForm onCreated={jest.fn()} onCancel={jest.fn()} /></div>);
  await screen.findByRole("option", { name: "Production" });
  save("form", result.container.innerHTML);
  result.unmount();
});

test("500 requests render 50 cards per page with next, previous and page jump", async () => {
  const many = Array.from({ length: 500 }, (_, index) => ({
    ...requests[0], _id: `request-${index}`, positionTitle: `Position ${index + 1}`,
  }));
  service.getManpowerRequirements.mockResolvedValue({ records: many });
  const { container } = render(<ManpowerApp />);
  await screen.findByText("Position 1");
  expect(container.querySelectorAll(".se-mpa-card")).toHaveLength(50);
  expect(screen.getByText("1–50 of 500")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("Position 51")).toBeInTheDocument();
  expect(screen.queryByText("Position 1")).not.toBeInTheDocument();
  expect(screen.getByText("51–100 of 500")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Go to request page"), { target: { value: "10" } });
  expect(screen.getByText("451–500 of 500")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
  expect(screen.getByText("401–450 of 500")).toBeInTheDocument();
});

test("changing filters resets pagination and handles a partial last page", async () => {
  const many = Array.from({ length: 53 }, (_, index) => ({
    ...requests[0], _id: `request-${index}`, positionTitle: `Position ${index + 1}`,
    status: index === 0 ? "APPROVED" : "PENDING_APPROVAL",
  }));
  service.getManpowerRequirements.mockResolvedValue({ records: many });
  const { container, rerender } = render(<ManpowerApp />);
  await screen.findByText("Position 1");
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(container.querySelectorAll(".se-mpa-card")).toHaveLength(3);
  expect(screen.getByText("51–53 of 53")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Approved", exact: true }));
  expect(screen.getByText("1–1 of 1")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  rerender(<ManpowerApp search="no match" />);
  expect(screen.queryByRole("navigation", { name: "Request pagination" })).not.toBeInTheDocument();
});
