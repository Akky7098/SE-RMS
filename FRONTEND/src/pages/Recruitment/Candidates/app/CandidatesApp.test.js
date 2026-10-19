import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CandidatesApp from "./CandidatesApp";
import { candidateGroup, loadCandidateAppData } from "./candidateAppData";
import { getHrHiringQueue, getMyHiring } from "../../../../services/manpowerService";
import { getRequirementCandidates } from "../../../../services/recruitmentService";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../../../../services/manpowerService", () => ({ getHrHiringQueue: jest.fn(), getMyHiring: jest.fn() }));
jest.mock("../../../../services/recruitmentService", () => ({ getRequirementCandidates: jest.fn() }));
jest.mock("./AddCandidateApp", () => ({
  __esModule: true,
  default: ({ open, requirement, onCreated }) => open ? <div><span>Intake for {requirement.positionTitle}</span><button onClick={() => onCreated({ _id: "created" })}>Finish intake</button></div> : null,
}));

const roles = [
  { _id: "role1", positionTitle: "CNC Machine Operator", requestNumber: "MPR-2026-041", status: "HIRING_IN_PROGRESS", assignedHr: { _id: "hr1" }, department: { name: "Production" } },
  { _id: "role2", positionTitle: "Quality Inspector", requestNumber: "MPR-2026-040", status: "APPROVED", assignedHr: null, department: { name: "Quality" } },
];
const candidates = [
  { _id: "one", fullName: "Demo Candidate One", candidateNumber: "CAN-2026-021", mobile: "9000000001", email: "one@example.com", totalExperienceYears: 4, status: "INTERVIEW_SCHEDULED", nextAction: "ATTEND_INTERVIEW", updatedAt: "2026-10-15" },
  { _id: "two", fullName: "Demo Candidate Two", candidateNumber: "CAN-2026-020", totalExperienceYears: 2, status: "ON_HOLD", updatedAt: "2026-10-14" },
  { _id: "three", fullName: "Demo Candidate Three", candidateNumber: "CAN-2026-019", totalExperienceYears: 6, status: "OFFER_ACCEPTED", updatedAt: "2026-10-13" },
];

beforeEach(() => {
  jest.clearAllMocks();
  getHrHiringQueue.mockResolvedValue(roles);
  getMyHiring.mockResolvedValue([roles[0]]);
  getRequirementCandidates.mockImplementation((id) => Promise.resolve(id === "role1" ? candidates : []));
});

test("deduplicates requirements and candidates and tolerates role-based queue denial", async () => {
  getHrHiringQueue.mockRejectedValue({ response: { status: 403 } });
  const result = await loadCandidateAppData();
  expect(result.requirements).toHaveLength(1);
  expect(result.candidates).toHaveLength(3);
  expect(getRequirementCandidates).toHaveBeenCalledTimes(1);
});

test("retains web candidate status groups", () => {
  expect(candidateGroup("OFFER_ACCEPTED")).toBe("SELECTED");
  expect(candidateGroup("REJECTED_INTERVIEW")).toBe("REJECTED");
  expect(candidateGroup("ON HOLD")).toBe("HOLD");
  expect(candidateGroup("INTERVIEW_SCHEDULED")).toBe("INTERVIEW");
});

test("candidate cards filter by workflow and search and open the existing detail route", async () => {
  const { rerender } = render(<CandidatesApp />);
  await screen.findByText("Demo Candidate One");
  fireEvent.click(screen.getByRole("button", { name: "Filter candidates" }));
  fireEvent.click(screen.getByRole("radio", { name: "On hold" }));
  fireEvent.click(screen.getByRole("button", { name: "Show results" }));
  expect(screen.getByText("Demo Candidate Two")).toBeInTheDocument();
  expect(screen.queryByText("Demo Candidate One")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  rerender(<CandidatesApp search="one@example.com" />);
  expect(screen.getByText("Demo Candidate One")).toBeInTheDocument();
  expect(screen.queryByText("Demo Candidate Two")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Call Demo Candidate One" })).toHaveAttribute("href", "tel:9000000001");
  fireEvent.click(screen.getByRole("button", { name: "View Demo Candidate One" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=candidate&id=one");
});

test("candidate intake only offers approved or hiring roles with an owner", async () => {
  render(<CandidatesApp />);
  await screen.findByText("Demo Candidate One");
  fireEvent.click(screen.getByRole("button", { name: "+ Add candidate" }));
  expect(screen.queryByText("Quality Inspector")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /CNC Machine Operator.*Add to this role/ }));
  expect(screen.getByText("Intake for CNC Machine Operator")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Finish intake" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=candidate&id=created");
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled());
});

test("500 candidates render fifty cards per page, with direct page jump", async () => {
  getRequirementCandidates.mockImplementation((id) => Promise.resolve(id === "role1" ? Array.from({ length: 500 }, (_, index) => ({ ...candidates[0], _id: `candidate-${index}`, fullName: `Candidate ${index + 1}` })) : []));
  const { container } = render(<CandidatesApp />);
  await screen.findByText("Candidate 1");
  expect(container.querySelectorAll(".se-caa-card")).toHaveLength(50);
  fireEvent.change(screen.getByLabelText("Go to candidate page"), { target: { value: "10" } });
  expect(screen.getByText("451–500 of 500")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Filter candidates" }));
  fireEvent.click(screen.getByRole("radio", { name: "Interview" }));
  fireEvent.click(screen.getByRole("button", { name: "Show results" }));
  expect(screen.getByText("1–50 of 500")).toBeInTheDocument();
});

test("partial candidate loads show a warning and total failure is not an empty success", async () => {
  getRequirementCandidates.mockImplementation((id) => id === "role1" ? Promise.resolve(candidates) : Promise.reject(new Error("Unavailable")));
  render(<CandidatesApp />);
  expect(await screen.findByText("Some hiring roles could not load. Refresh to retry.")).toBeInTheDocument();
  getRequirementCandidates.mockRejectedValue(new Error("Offline"));
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Candidates could not load");
});

test("per-role candidate fetches never exceed four concurrent requests", async () => {
  getHrHiringQueue.mockResolvedValue(Array.from({ length: 12 }, (_, index) => ({ ...roles[0], _id: `role-${index}` })));
  getMyHiring.mockResolvedValue([]);
  let active = 0;
  let maximum = 0;
  getRequirementCandidates.mockImplementation(async () => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active -= 1;
    return [];
  });
  await loadCandidateAppData();
  expect(maximum).toBeLessThanOrEqual(4);
});

test("optional preview uses demo candidate records only", async () => {
  if (!process.env.CANDIDATE_PREVIEW_DIR) return;
  const fs = require("fs");
  const path = require("path");
  fs.mkdirSync(process.env.CANDIDATE_PREVIEW_DIR, { recursive: true });
  const css = fs.readFileSync(path.join(__dirname, "CandidatesApp.css"), "utf8") + fs.readFileSync(path.join(__dirname, "../../../Dashboard/DashboardApp.css"), "utf8");
  const result = render(<CandidatesApp />);
  const { container } = result;
  await screen.findByText("Demo Candidate One");
  fs.writeFileSync(path.join(process.env.CANDIDATE_PREVIEW_DIR, "candidates.html"), `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-app-dashboard se-app-dashboard--workspace"><header class="se-app-dashboard__topbar"><button class="se-app-dashboard__back">‹</button><h1>Candidates</h1><button class="se-app-dashboard__back">⌕</button><button class="se-app-dashboard__avatar">D</button></header><div class="se-app-dashboard__body">${container.innerHTML}</div></main></body></html>`);
  fireEvent.click(screen.getByRole("button", { name: "Filter candidates" }));
  fs.writeFileSync(path.join(process.env.CANDIDATE_PREVIEW_DIR, "filters.html"), `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body>${container.innerHTML}</body></html>`);
  result.unmount();
  const Intake = jest.requireActual("./AddCandidateApp").default;
  const intake = render(<section className="se-caa"><div className="se-caa-entry"><Intake open requirement={roles[0]} onClose={jest.fn()} onCreated={jest.fn()} /></div></section>);
  const intakeCss = fs.readFileSync(path.join(__dirname, "../CandidateEntry.css"), "utf8") + fs.readFileSync(path.join(__dirname, "CandidateFormApp.css"), "utf8");
  fs.writeFileSync(path.join(process.env.CANDIDATE_PREVIEW_DIR, "intake.html"), `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${intakeCss}${css}</style></head><body>${intake.container.innerHTML}</body></html>`);
});

test("filter sheet dismisses without applying and restores focus", async () => {
  render(<CandidatesApp />);
  await screen.findByText("Demo Candidate One");
  const trigger = screen.getByRole("button", { name: "Filter candidates" });
  trigger.focus();
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("radio", { name: "On hold" }));
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Demo Candidate One")).toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
