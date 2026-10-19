import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import InterviewDetailApp from "./InterviewDetailApp";
import { getInterview, getInterviews, checkInInterview, rescheduleInterview, cancelInterview } from "../../../../services/interviewService";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate, useLocation: () => ({ search: "?id=demo" }) }));
jest.mock("../../../../services/interviewService", () => ({
  getInterview: jest.fn(), getInterviews: jest.fn(), checkInInterview: jest.fn(), rescheduleInterview: jest.fn(), cancelInterview: jest.fn(),
}));
jest.mock("../InterviewEvaluationPanel", () => ({
  __esModule: true, default: () => <button type="button">Complete Evaluation</button>,
}));
const demo = {
  _id: "demo", candidate: { _id: "person", fullName: "Demo Candidate", mobile: "9000000000" },
  interviewNumber: "INT-DEMO-001", positionTitle: "Quality Inspector", roundName: "Technical round", roundNumber: 1,
  scheduledAt: new Date().toISOString(), timezone: "Asia/Kolkata", status: "SCHEDULED", mode: "ONLINE",
  meetingLink: "https://example.com/demo", interviewer: { displayName: "Demo Interviewer" }, checkInToken: "demo-token",
};
beforeEach(() => {
  jest.clearAllMocks();
  getInterview.mockResolvedValue(demo);
  getInterviews.mockResolvedValue([demo]);
  checkInInterview.mockResolvedValue({});
  rescheduleInterview.mockResolvedValue({});
  cancelInterview.mockResolvedValue({});
});

test("arrival requires confirmation and preserves the check-in token", async () => {
  render(<InterviewDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  fireEvent.click(screen.getByRole("button", { name: /Mark candidate arrived/ }));
  expect(checkInInterview).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm arrival" }));
  await waitFor(() => expect(checkInInterview).toHaveBeenCalledWith("demo", { checkInToken: "demo-token" }));
  await screen.findByRole("button", { name: "Done" });
});

test("future and past interviews cannot be checked in", async () => {
  getInterview.mockResolvedValue({ ...demo, scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString() });
  const result = render(<InterviewDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  expect(screen.getByRole("button", { name: /Mark candidate arrived/ })).toBeDisabled();
  result.unmount();
  getInterview.mockResolvedValue({ ...demo, scheduledAt: new Date(Date.now() - 2 * 86400000).toISOString() });
  render(<InterviewDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  expect(screen.getByRole("button", { name: /Mark candidate arrived/ })).toBeDisabled();
  expect(screen.getByText("Interview date has passed.")).toBeInTheDocument();
});

test("cancellation validates the reason and uses the existing payload", async () => {
  render(<InterviewDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  fireEvent.click(screen.getByRole("button", { name: "Cancel interview" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel interview" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Enter a cancellation reason");
  expect(cancelInterview).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  fireEvent.change(screen.getByLabelText("Cancellation reason *"), { target: { value: "Candidate unavailable" } });
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel interview" }));
  await waitFor(() => expect(cancelInterview).toHaveBeenCalledWith("demo", {
    reason: "Candidate unavailable", cancellationReason: "Candidate unavailable",
  }));
  await screen.findByRole("button", { name: "Done" });
});

test("rescheduling rejects past times and saves a future ISO timestamp", async () => {
  render(<InterviewDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  fireEvent.click(screen.getByRole("button", { name: /Reschedule/ }));
  fireEvent.change(screen.getByLabelText("New date & time"), { target: { value: "2020-01-01T10:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Save new time" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("valid future date");
  expect(rescheduleInterview).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  const future = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16);
  fireEvent.change(screen.getByLabelText("New date & time"), { target: { value: future } });
  fireEvent.click(screen.getByRole("button", { name: "Save new time" }));
  await waitFor(() => expect(rescheduleInterview).toHaveBeenCalledWith("demo", {
    scheduledAt: new Date(future).toISOString(), reason: "", remarks: "",
  }));
  await screen.findByRole("button", { name: "Done" });
});

test("only checked-in interviews expose evaluation and closed rounds hide changes", async () => {
  getInterview.mockResolvedValue({ ...demo, status: "CHECKED_IN" });
  const result = render(<InterviewDetailApp />);
  await screen.findByRole("button", { name: "Complete Evaluation" });
  result.unmount();
  getInterview.mockResolvedValue({ ...demo, status: "COMPLETED" });
  render(<InterviewDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  expect(screen.queryByRole("button", { name: /Reschedule/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Complete Evaluation" })).not.toBeInTheDocument();
});

test("optional detail and action previews use demo records", async () => {
  if (!process.env.INTERVIEW_PREVIEW_DIR) return;
  const fs = require("fs");
  const path = require("path");
  fs.mkdirSync(process.env.INTERVIEW_PREVIEW_DIR, { recursive: true });
  const { container } = render(<InterviewDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  await waitFor(() => expect(screen.getByText("All rounds · 1")).toBeInTheDocument());
  const css = fs.readFileSync(path.join(__dirname, "../Interviews.css"), "utf8") + fs.readFileSync(path.join(__dirname, "InterviewsApp.css"), "utf8");
  const wrap = html => `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body>${html}</body></html>`;
  fs.writeFileSync(path.join(process.env.INTERVIEW_PREVIEW_DIR, "detail.html"), wrap(container.innerHTML));
  fireEvent.click(screen.getByRole("button", { name: /Reschedule/ }));
  fs.writeFileSync(path.join(process.env.INTERVIEW_PREVIEW_DIR, "reschedule.html"), wrap(container.innerHTML));
});
