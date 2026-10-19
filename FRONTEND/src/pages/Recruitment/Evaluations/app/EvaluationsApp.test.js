import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EvaluationsApp from "./EvaluationsApp";
import { getEvaluations } from "../../../../services/evaluationService";
import { groupEvaluationsByCandidate, loadEvaluationRecords } from "./evaluationAppData";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../../../../services/evaluationService", () => ({ getEvaluations: jest.fn() }));
const demo = [
  { _id: "review-one", candidate: { _id: "one", fullName: "Demo Candidate One", positionTitle: "Quality Inspector", candidateNumber: "CAN-DEMO-001" }, interview: { roundName: "Final round" }, overallRating: 4.2, finalDecision: "SELECTED", recommendation: "HIRE", evaluatedAt: "2026-10-15", evaluatedBy: { displayName: "Demo Evaluator" } },
  { _id: "review-old", candidate: { _id: "one", fullName: "Demo Candidate One" }, overallRating: 3.8, finalDecision: "HOLD", evaluatedAt: "2026-10-14" },
  { _id: "review-two", candidate: { _id: "two", fullName: "Demo Candidate Two", positionTitle: "Machine Operator" }, interview: { roundName: "Technical round" }, overallRating: 3.2, finalDecision: "HOLD", recommendation: "HOLD", evaluatedAt: "2026-10-14", evaluatedBy: { displayName: "Demo Interviewer" } },
  { _id: "review-three", candidate: { _id: "three", fullName: "Demo Candidate Three", positionTitle: "Maintenance Fitter" }, overallRating: 2, finalDecision: "REJECTED", recommendation: "REJECT", evaluatedAt: "2026-10-13" },
];
beforeEach(() => {
  jest.clearAllMocks();
  getEvaluations.mockResolvedValue({ records: demo, pagination: { pages: 1 } });
});

test("candidate cards use the latest decision and group older rounds", async () => {
  const { container } = render(<EvaluationsApp />);
  await screen.findByText("Demo Candidate One");
  expect(container.querySelectorAll(".se-eva-card")).toHaveLength(3);
  expect(screen.getByText("2 rounds")).toBeInTheDocument();
  const groups = groupEvaluationsByCandidate(demo);
  expect(groups[0].decision).toBe("SELECTED");
  expect(groups[0].averageRating).toBe(4);
  fireEvent.click(screen.getByRole("button", { name: "View evaluation for Demo Candidate One" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=evaluation&id=review-one&candidateId=one");
});

test("decision filters use the latest result and search includes evaluators", async () => {
  const { rerender } = render(<EvaluationsApp />);
  await screen.findByText("Demo Candidate One");
  fireEvent.click(screen.getByRole("button", { name: /On hold/ }));
  expect(screen.queryByText("Demo Candidate One")).not.toBeInTheDocument();
  expect(screen.getByText("Demo Candidate Two")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  rerender(<EvaluationsApp search="Demo Evaluator" />);
  expect(screen.getByText("Demo Candidate One")).toBeInTheDocument();
  expect(screen.queryByText("Demo Candidate Two")).not.toBeInTheDocument();
});

test("recommendation filters open as a sheet and apply on confirmation", async () => {
  render(<EvaluationsApp />);
  await screen.findByText("Demo Candidate One");
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  fireEvent.click(screen.getByRole("radio", { name: "Reject" }));
  expect(screen.getByText("Demo Candidate One")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show evaluations" }));
  expect(screen.queryByText("Demo Candidate One")).not.toBeInTheDocument();
  expect(screen.getByText("Demo Candidate Three")).toBeInTheDocument();
});

test("API pages beyond the 100-record cap load and display fifty cards per page", async () => {
  const records = Array.from({ length: 500 }, (_, index) => ({
    ...demo[0], _id: `review-${index}`, candidate: { _id: `person-${index}`, fullName: `Person ${index}` },
  }));
  getEvaluations.mockImplementation(({ page, limit }) => Promise.resolve({ records: records.slice((page - 1) * limit, page * limit), pagination: { pages: 5 } }));
  const { container } = render(<EvaluationsApp />);
  await screen.findByText("Person 0");
  expect(getEvaluations).toHaveBeenCalledTimes(5);
  expect(container.querySelectorAll(".se-eva-card")).toHaveLength(50);
  fireEvent.change(screen.getByLabelText("Go to evaluation page"), { target: { value: "10" } });
  expect(screen.getByText("451–500 of 500")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
});

test("a failed API page reports failure instead of a misleading partial list", async () => {
  getEvaluations.mockImplementation(({ page }) => page === 1
    ? Promise.resolve({ records: demo, pagination: { pages: 2 } }) : Promise.reject(new Error("Page unavailable")));
  render(<EvaluationsApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Page unavailable");
  expect(screen.queryByText("Demo Candidate One")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});

test("loader deduplicates evaluations across API page boundaries", async () => {
  getEvaluations.mockResolvedValue({ records: demo, pagination: { pages: 2 } });
  expect(await loadEvaluationRecords()).toHaveLength(4);
});

test("optional previews use demo data", async () => {
  if (!process.env.EVALUATION_PREVIEW_DIR) return;
  const fs = require("fs");
  const path = require("path");
  fs.mkdirSync(process.env.EVALUATION_PREVIEW_DIR, { recursive: true });
  const { container } = render(<EvaluationsApp />);
  await screen.findByText("Demo Candidate One");
  const css = ["../../Interviews/app/InterviewsApp.css", "EvaluationsApp.css", "../../../Dashboard/DashboardApp.css"]
    .map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  const wrap = html => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-app-dashboard se-app-dashboard--workspace"><header class="se-app-dashboard__topbar"><button class="se-app-dashboard__back">‹</button><h1>Evaluations</h1><button class="se-app-dashboard__back">⌕</button><button class="se-app-dashboard__avatar">D</button></header><div class="se-app-dashboard__body">${html}</div></main></body></html>`;
  fs.writeFileSync(path.join(process.env.EVALUATION_PREVIEW_DIR, "evaluations.html"), wrap(container.innerHTML));
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  fs.writeFileSync(path.join(process.env.EVALUATION_PREVIEW_DIR, "filters.html"), wrap(container.innerHTML));
});
