import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import InterviewsApp from "./InterviewsApp";
import { getInterviews } from "../../../../services/interviewService";
import { groupInterviewsByCandidate } from "./interviewAppData";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../../../../services/interviewService", () => ({ getInterviews: jest.fn() }));
const demo = [
  { _id: "round1", candidate: { _id: "one", fullName: "Demo Candidate One", mobile: "9000000001" }, positionTitle: "Machine Operator", roundNumber: 1, roundName: "Technical round", status: "COMPLETED", scheduledAt: new Date(Date.now() - 86400000).toISOString(), mode: "IN_PERSON", interviewer: { displayName: "Demo Interviewer" } },
  { _id: "round2", candidate: { _id: "one", fullName: "Demo Candidate One", mobile: "9000000001" }, positionTitle: "Machine Operator", roundNumber: 2, roundName: "Final round", status: "SCHEDULED", scheduledAt: new Date(Date.now() + 86400000).toISOString(), mode: "ONLINE", interviewer: { displayName: "Demo Manager" } },
  { _id: "round3", candidate: { _id: "two", fullName: "Demo Candidate Two" }, positionTitle: "Quality Inspector", roundNumber: 1, roundName: "Technical round", status: "CHECKED_IN", scheduledAt: new Date().toISOString(), mode: "IN_PERSON" },
  { _id: "round4", candidate: { _id: "three", fullName: "Demo Candidate Three" }, positionTitle: "Maintenance Fitter", roundNumber: 1, status: "CANCELLED", scheduledAt: new Date().toISOString(), mode: "PHONE" },
];
beforeEach(() => {
  jest.clearAllMocks();
  getInterviews.mockResolvedValue(demo);
});

test("groups rounds per candidate and opens the upcoming round", async () => {
  const { container } = render(<InterviewsApp />);
  await screen.findByText("Demo Candidate One");
  expect(container.querySelectorAll(".se-iva-card")).toHaveLength(3);
  expect(screen.getByText("2 rounds")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View interview for Demo Candidate One" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=interview&id=round2&candidateId=one");
  expect(screen.getByRole("link", { name: "Call Demo Candidate One" })).toHaveAttribute("href", "tel:9000000001");
  expect(groupInterviewsByCandidate(demo)[0].records).toHaveLength(2);
});

test("search and quick views preserve candidate grouping", async () => {
  const { rerender } = render(<InterviewsApp />);
  await screen.findByText("Demo Candidate One");
  fireEvent.click(screen.getByRole("button", { name: /Upcoming/ }));
  expect(screen.queryByText("Demo Candidate Two")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  rerender(<InterviewsApp search="Demo Manager" />);
  expect(screen.getByText("Demo Candidate One")).toBeInTheDocument();
  expect(screen.queryByText("Demo Candidate Three")).not.toBeInTheDocument();
});

test("bottom sheet applies real mode values and dismisses draft changes", async () => {
  render(<InterviewsApp />);
  await screen.findByText("Demo Candidate One");
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  fireEvent.click(screen.getByRole("radio", { name: "Phone" }));
  fireEvent.click(screen.getByRole("button", { name: "Show interviews" }));
  expect(screen.getByText("Demo Candidate Three")).toBeInTheDocument();
  expect(screen.queryByText("Demo Candidate One")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Filters (1)" }));
  fireEvent.click(screen.getByRole("radio", { name: "Online" }));
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Demo Candidate Three")).toBeInTheDocument();
});

test("500 candidates paginate in groups of fifty", async () => {
  getInterviews.mockResolvedValue(Array.from({ length: 500 }, (_, index) => ({
    ...demo[1], _id: `interview-${index}`, candidate: { _id: `candidate-${index}`, fullName: `Person ${index}` },
  })));
  const { container } = render(<InterviewsApp />);
  await screen.findByText("Person 0");
  expect(container.querySelectorAll(".se-iva-card")).toHaveLength(50);
  fireEvent.change(screen.getByRole("combobox", { name: "Go to interview page" }), { target: { value: "10" } });
  expect(screen.getByText("451–500 of 500")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /Upcoming/ }));
  expect(screen.getByText("1–50 of 500")).toBeInTheDocument();
});

test("failed loading is retryable and not presented as no interviews", async () => {
  getInterviews.mockRejectedValueOnce(new Error("Offline"));
  render(<InterviewsApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  expect(screen.queryByText("No interviews found")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Demo Candidate One");
});

test("optional previews use demo records", async () => {
  if (!process.env.INTERVIEW_PREVIEW_DIR) return;
  const fs = require("fs");
  const path = require("path");
  fs.mkdirSync(process.env.INTERVIEW_PREVIEW_DIR, { recursive: true });
  const { container } = render(<InterviewsApp />);
  await screen.findByText("Demo Candidate One");
  const css = fs.readFileSync(path.join(__dirname, "InterviewsApp.css"), "utf8") + fs.readFileSync(path.join(__dirname, "../../../Dashboard/DashboardApp.css"), "utf8");
  const wrap = html => `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-app-dashboard se-app-dashboard--workspace"><header class="se-app-dashboard__topbar"><button class="se-app-dashboard__back">‹</button><h1>Interviews</h1><button class="se-app-dashboard__back">⌕</button><button class="se-app-dashboard__avatar">D</button></header><div class="se-app-dashboard__body">${html}</div></main></body></html>`;
  fs.writeFileSync(path.join(process.env.INTERVIEW_PREVIEW_DIR, "interviews.html"), wrap(container.innerHTML));
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  fs.writeFileSync(path.join(process.env.INTERVIEW_PREVIEW_DIR, "filters.html"), wrap(container.innerHTML));
});
