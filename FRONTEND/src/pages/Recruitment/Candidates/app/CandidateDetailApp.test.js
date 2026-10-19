import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CandidateDetailApp from "./CandidateDetailApp";
import { getCandidate, getCandidateTimeline } from "../../../../services/recruitmentService";
import { getInterviews } from "../../../../services/interviewService";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: "?id=demo" }),
}));
jest.mock("../../../../services/recruitmentService", () => ({ getCandidate: jest.fn(), getCandidateTimeline: jest.fn() }));
jest.mock("../../../../services/interviewService", () => ({ getInterviews: jest.fn() }));
jest.mock("../../../../services/api", () => ({ get: jest.fn() }));
jest.mock("../CandidateActionPanel", () => ({
  __esModule: true,
  default: ({ candidate, interviews, onOpenInterview }) => (
    <button onClick={() => onOpenInterview(interviews[0])}>Actions for {candidate.fullName}</button>
  ),
}));

beforeEach(() => {
  getCandidate.mockResolvedValue({
    _id: "demo", fullName: "Demo Candidate", mobile: "9000000000", currentSalary: 720000,
    expectedSalary: 768000, status: "INTERVIEW_SCHEDULED", totalExperienceYears: 4,
    manpowerRequirement: { _id: "role", positionTitle: "Fitter" },
    education: [{ qualification: "Diploma", institute: "Demo College" }],
  });
  getCandidateTimeline.mockResolvedValue([]);
  getInterviews.mockResolvedValue([{ _id: "interview", status: "SCHEDULED" }]);
});

test("mobile drill-down uses real salary fields and preserves interview action navigation", async () => {
  render(<CandidateDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  expect(screen.getByText("₹7,20,000")).toBeInTheDocument();
  expect(screen.getByText("₹7,68,000")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "☎ Call" })).toHaveAttribute("href", "tel:9000000000");
  expect(screen.getByText("Education & employment").parentElement).not.toHaveAttribute("open");
  fireEvent.click(screen.getByText("Actions for Demo Candidate"));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=interview&id=interview");
});

test("secondary endpoint failure is visible without hiding the candidate", async () => {
  getInterviews.mockRejectedValue(new Error("Offline"));
  render(<CandidateDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  expect(screen.getByRole("status")).toHaveTextContent("Some interview or activity details could not load");
});

test("candidate failure offers retry rather than empty details", async () => {
  getCandidate.mockRejectedValue(new Error("Offline"));
  render(<CandidateDetailApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});

test("optional detail preview uses demo records", async () => {
  if (!process.env.CANDIDATE_PREVIEW_DIR) return;
  const fs = require("fs");
  const path = require("path");
  const { container } = render(<CandidateDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  const css = fs.readFileSync(path.join(__dirname, "CandidateDetailApp.css"), "utf8");
  fs.writeFileSync(path.join(process.env.CANDIDATE_PREVIEW_DIR, "detail.html"),
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body>${container.innerHTML}</body></html>`);
});
