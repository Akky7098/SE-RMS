import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import EvaluationDetailApp from "./EvaluationDetailApp";
import { getEvaluation, getEvaluations, openEvaluationAttachment, resendEvaluationDecisionEmail } from "../../../../services/evaluationService";
import { getSelectionByCandidate } from "../../../../services/selectionService";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate, useLocation: () => ({ search: "?id=review&candidateId=wrong-person" }) }));
jest.mock("../../../../services/evaluationService", () => ({
  getEvaluation: jest.fn(), getEvaluations: jest.fn(), openEvaluationAttachment: jest.fn(), resendEvaluationDecisionEmail: jest.fn(),
}));
jest.mock("../../../../services/selectionService", () => ({ getSelectionByCandidate: jest.fn() }));
const demo = {
  _id: "review", candidate: { _id: "person", fullName: "Demo Candidate", candidateNumber: "CAN-DEMO-001", positionTitle: "Quality Inspector", email: "demo@example.com" },
  interview: { _id: "interview", roundName: "Final round" }, evaluatedBy: { displayName: "Demo Evaluator" },
  overallRating: 4.2, technicalSkills: 4, relevantExperience: 4, communication: 5, problemSolving: 4, roleFit: 4, professionalism: 4,
  finalDecision: "SELECTED", recommendation: "HIRE", evaluatedAt: "2026-10-15",
  strengths: "Careful inspection and clear communication.", concerns: "Needs product familiarisation.",
  attachment: { storedName: "demo.pdf", originalName: "Interview notes.pdf" }, decisionEmail: { status: "FAILED", email: "demo@example.com" },
};
const older = { ...demo, _id: "older", evaluatedAt: "2026-10-14", interview: { roundName: "Technical round" }, finalDecision: "HOLD" };
beforeEach(() => {
  jest.clearAllMocks();
  getEvaluation.mockResolvedValue(demo);
  getEvaluations.mockResolvedValue({ records: [demo, older, { ...older, _id: "foreign", candidate: { _id: "wrong-person", fullName: "Other candidate" } }], pagination: { pages: 1 } });
  getSelectionByCandidate.mockResolvedValue({ _id: "selection", selectionNumber: "SEL-DEMO-001", workflow: { stageLabel: "Offer pending" } });
  openEvaluationAttachment.mockResolvedValue({});
  resendEvaluationDecisionEmail.mockResolvedValue({});
});

test("detail uses the fetched candidate identity and navigates rounds through the router", async () => {
  render(<EvaluationDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  expect(getSelectionByCandidate).toHaveBeenCalledWith("person");
  fireEvent.click(screen.getByRole("button", { name: "Change round" }));
  const sheet = screen.getByRole("dialog");
  expect(within(sheet).getAllByRole("button")).toHaveLength(3);
  fireEvent.click(within(sheet).getByRole("button", { name: /Technical round/ }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=evaluation&id=older&candidateId=person", { replace: true });
});

test("document and selection buttons retain the existing service and detail route", async () => {
  render(<EvaluationDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  fireEvent.click(screen.getByRole("button", { name: "Open file ↗" }));
  await waitFor(() => expect(openEvaluationAttachment).toHaveBeenCalledWith("review"));
  fireEvent.click(screen.getByRole("button", { name: "Open selection ›" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=selection&id=selection");
});

test("decision email requires a clear in-app confirmation", async () => {
  render(<EvaluationDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  fireEvent.click(screen.getByText(/Decision email ·/));
  fireEvent.click(screen.getByRole("button", { name: "Send decision email" }));
  expect(resendEvaluationDecisionEmail).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Send email" }));
  await waitFor(() => expect(resendEvaluationDecisionEmail).toHaveBeenCalledWith("review"));
  expect(await screen.findByRole("status")).toHaveTextContent("Decision email request sent");
});

test("round loading failures preserve the current review with a visible warning", async () => {
  getEvaluations.mockRejectedValue(new Error("Offline"));
  render(<EvaluationDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  expect(screen.getByRole("status")).toHaveTextContent("Other rounds could not load");
  expect(screen.getByText("Careful inspection and clear communication.")).toBeInTheDocument();
});

test("fatal failure is retryable", async () => {
  getEvaluation.mockRejectedValue(new Error("Offline"));
  render(<EvaluationDetailApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});

test("optional detail previews use demo data", async () => {
  if (!process.env.EVALUATION_PREVIEW_DIR) return;
  const fs = require("fs");
  const path = require("path");
  fs.mkdirSync(process.env.EVALUATION_PREVIEW_DIR, { recursive: true });
  const { container } = render(<EvaluationDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  const css = ["../../Interviews/app/InterviewsApp.css", "EvaluationsApp.css"].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  const wrap = html => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body>${html}</body></html>`;
  fs.writeFileSync(path.join(process.env.EVALUATION_PREVIEW_DIR, "detail.html"), wrap(container.innerHTML));
  fireEvent.click(screen.getByRole("button", { name: "Change round" }));
  fs.writeFileSync(path.join(process.env.EVALUATION_PREVIEW_DIR, "rounds.html"), wrap(container.innerHTML));
});
