import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SelectionsApp from "./SelectionsApp";
import { getSelections } from "../../../../services/selectionService";
import { deduplicateSelections } from "./selectionAppData";
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../../../../services/selectionService", () => ({ getSelections: jest.fn() }));
const demo = [
  { _id: "selection-one", candidate: { _id: "one", fullName: "Demo Candidate One", mobile: "9000000001" }, selectionNumber: "SEL-DEMO-001", positionTitle: "Quality Inspector", status: "LOI_DRAFT", updatedAt: "2026-10-15", hiringHr: { displayName: "Demo HR" }, workflow: { stageLabel: "Letter ready", nextActionLabel: "Review and send letter", progressPercent: 20, actionDue: true } },
  { _id: "old-one", candidate: { _id: "one", fullName: "Demo Candidate One" }, status: "LOI_PENDING", updatedAt: "2026-10-13" },
  { _id: "selection-two", candidate: { _id: "two", fullName: "Demo Candidate Two" }, positionTitle: "Machine Operator", status: "DOCUMENT_VERIFICATION", updatedAt: "2026-10-14", workflow: { stageLabel: "Verify documents", nextActionLabel: "Check submitted files", progressPercent: 45 } },
  { _id: "selection-three", candidate: { _id: "three", fullName: "Demo Candidate Three" }, positionTitle: "Maintenance Fitter", status: "JOINING_CONFIRMED", updatedAt: "2026-10-12", proposedJoiningDate: "2026-10-20", workflow: { stageLabel: "Joining confirmed", nextActionLabel: "Joining confirmed", progressPercent: 100 } },
];
beforeEach(() => {
  jest.clearAllMocks();
  getSelections.mockResolvedValue({ records: demo, pagination: { pages: 1 } });
});
test("latest selection per candidate is shown with a clear next action", async () => {
  const { container } = render(<SelectionsApp />);
  await screen.findByText("Demo Candidate One");
  expect(container.querySelectorAll(".se-sla-card")).toHaveLength(3);
  expect(deduplicateSelections(demo)[0]._id).toBe("selection-one");
  expect(screen.getByText("Review and send letter")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View selection for Demo Candidate One" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=selection&id=selection-one");
});
test("stage and attention filters combine with search", async () => {
  const { rerender } = render(<SelectionsApp />);
  await screen.findByText("Demo Candidate One");
  fireEvent.click(screen.getByRole("button", { name: /Documents/ }));
  expect(screen.queryByText("Demo Candidate One")).not.toBeInTheDocument();
  expect(screen.getByText("Demo Candidate Two")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  fireEvent.click(screen.getByRole("radio", { name: "Action due only" }));
  fireEvent.click(screen.getByRole("button", { name: "Show candidates" }));
  expect(screen.getByText("Demo Candidate One")).toBeInTheDocument();
  expect(screen.queryByText("Demo Candidate Two")).not.toBeInTheDocument();
  rerender(<SelectionsApp search="Demo HR" />);
  expect(screen.getByText("Demo Candidate One")).toBeInTheDocument();
});
test("loads all API pages and shows fifty cards per mobile page", async () => {
  const records = Array.from({ length: 500 }, (_, index) => ({ ...demo[0], _id: `sel-${index}`, candidate: { _id: `person-${index}`, fullName: `Person ${index}` } }));
  getSelections.mockImplementation(({ page, limit }) => Promise.resolve({ records: records.slice((page - 1) * limit, page * limit), pagination: { pages: 5 } }));
  const { container } = render(<SelectionsApp />);
  await screen.findByText("Person 0");
  expect(getSelections).toHaveBeenCalledTimes(5);
  expect(container.querySelectorAll(".se-sla-card")).toHaveLength(50);
  fireEvent.change(screen.getByLabelText("Go to selection page"), { target: { value: "10" } });
  expect(screen.getByText("451–500 of 500")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
});
test("joining filter includes completed and rescheduled selections", async () => {
  getSelections.mockResolvedValue({ records: [{ ...demo[0], status: "COMPLETED" }, { ...demo[2], status: "JOINING_RESCHEDULED" }] });
  render(<SelectionsApp />);
  await screen.findByText("Demo Candidate One");
  fireEvent.click(screen.getByRole("button", { name: /Joining/ }));
  expect(screen.getByText("2 candidates")).toBeInTheDocument();
});
test("API failure offers retry without presenting an empty success", async () => {
  getSelections.mockRejectedValue(new Error("Offline"));
  render(<SelectionsApp />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
});
test("optional list preview uses demo data", async () => {
  if (!process.env.SELECTION_PREVIEW_DIR) return;
  const fs = require("fs"), path = require("path");
  fs.mkdirSync(process.env.SELECTION_PREVIEW_DIR, { recursive: true });
  const { container } = render(<SelectionsApp />);
  await screen.findByText("Demo Candidate One");
  const css = ["../../Interviews/app/InterviewsApp.css", "SelectionsApp.css", "../../../Dashboard/DashboardApp.css"].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-app-dashboard se-app-dashboard--workspace"><header class="se-app-dashboard__topbar"><button class="se-app-dashboard__back">‹</button><h1>Selected candidates</h1><button class="se-app-dashboard__back">⌕</button><button class="se-app-dashboard__avatar">D</button></header><div class="se-app-dashboard__body">${container.innerHTML}</div></main></body></html>`;
  fs.writeFileSync(path.join(process.env.SELECTION_PREVIEW_DIR, "selections.html"), html);
});
