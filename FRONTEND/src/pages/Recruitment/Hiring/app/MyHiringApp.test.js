import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MyHiringApp from "./MyHiringApp";
import { getMyHiring } from "../../../../services/manpowerService";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../../../../services/manpowerService", () => ({ getMyHiring: jest.fn() }));

const records = [
  { _id: "one", requestNumber: "MPR-2026-041", positionTitle: "CNC Machine Operator", department: { name: "Production" }, numberOfOpenings: 3, requiredByDate: "2026-11-02", priority: "URGENT", status: "HIRING_IN_PROGRESS", requiredSkills: ["CNC operation", "Drawing reading", "Quality checks"] },
  { _id: "two", requestNumber: "MPR-2026-040", positionTitle: "Quality Inspector", department: { name: "Quality" }, numberOfOpenings: 1, requiredByDate: "2026-11-10", priority: "HIGH", status: "APPROVED", requiredSkills: ["Inspection", "Documentation"] },
  { _id: "three", requestNumber: "MPR-2026-039", positionTitle: "Accounts Executive", departmentName: "Finance", numberOfOpenings: 2, requiredByDate: "2026-11-15", priority: "NORMAL", status: "FILLED" },
];

beforeEach(() => {
  jest.clearAllMocks();
  getMyHiring.mockResolvedValue(records);
});

test("loads the scoped endpoint and opens a role with the correct return source", async () => {
  render(<MyHiringApp />);
  await screen.findByText("CNC Machine Operator");
  expect(getMyHiring).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Open hiring for CNC Machine Operator" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=hiring-workspace&id=one&from=my-hiring");
});

test("ready, active and urgent filters use the existing status rules", async () => {
  render(<MyHiringApp />);
  await screen.findByText("CNC Machine Operator");
  fireEvent.click(screen.getByRole("button", { name: /Ready to start/ }));
  expect(screen.getByText("Quality Inspector")).toBeInTheDocument();
  expect(screen.queryByText("CNC Machine Operator")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Urgent/ }));
  expect(screen.getByText("CNC Machine Operator")).toBeInTheDocument();
  expect(screen.queryByText("Quality Inspector")).not.toBeInTheDocument();
});

test("search includes skills and department fallback", async () => {
  const { rerender } = render(<MyHiringApp search="Drawing reading" />);
  await screen.findByText("CNC Machine Operator");
  expect(screen.queryByText("Quality Inspector")).not.toBeInTheDocument();
  rerender(<MyHiringApp search="Finance" />);
  expect(screen.getByText("Accounts Executive")).toBeInTheDocument();
});

test("candidate shortcut preserves the existing route", async () => {
  render(<MyHiringApp />);
  await screen.findByText("CNC Machine Operator");
  fireEvent.click(screen.getByRole("button", { name: "View candidates →" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=candidates");
});

test("500 roles render 50 cards per page with a page jump and filter reset", async () => {
  getMyHiring.mockResolvedValue(Array.from({ length: 500 }, (_, index) => ({ ...records[0], _id: `role-${index}`, positionTitle: `Role ${index + 1}` })));
  const { container } = render(<MyHiringApp />);
  await screen.findByText("Role 1");
  expect(container.querySelectorAll(".se-mha-card")).toHaveLength(50);
  fireEvent.change(screen.getByLabelText("Go to assigned roles page"), { target: { value: "10" } });
  expect(screen.getByText("451–500 of 500")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: /Urgent/ }));
  expect(screen.getByText("1–50 of 500")).toBeInTheDocument();
});

test("failed loads offer retry and empty accounts have no fabricated roles", async () => {
  getMyHiring.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce([]);
  render(<MyHiringApp />);
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("No roles assigned yet")).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "My hiring pagination" })).not.toBeInTheDocument();
});

test("optional mobile preview contains demo data only", async () => {
  if (!process.env.MY_HIRING_PREVIEW_DIR) return;
  const fs = require("fs");
  const path = require("path");
  fs.mkdirSync(process.env.MY_HIRING_PREVIEW_DIR, { recursive: true });
  const css = fs.readFileSync(path.join(__dirname, "MyHiringApp.css"), "utf8") + fs.readFileSync(path.join(__dirname, "../../../Dashboard/DashboardApp.css"), "utf8");
  const { container } = render(<MyHiringApp />);
  await screen.findByText("CNC Machine Operator");
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body><main class="se-app-dashboard se-app-dashboard--workspace"><header class="se-app-dashboard__topbar"><button class="se-app-dashboard__back">‹</button><h1>My Hiring</h1><button class="se-app-dashboard__back">⌕</button><button class="se-app-dashboard__avatar">D</button></header><div class="se-app-dashboard__body">${container.innerHTML}</div></main></body></html>`;
  fs.writeFileSync(path.join(process.env.MY_HIRING_PREVIEW_DIR, "my-hiring.html"), html);
});
