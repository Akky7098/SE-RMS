import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import SelectionDetailApp from "./SelectionDetailApp";
import { getSelection, getLoiReadiness, generateSelectionLoi, openSelectionLoiPdf, sendSelectionLoi, getSelectionDocuments, verifySelectionDocuments } from "../../../../services/selectionService";
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate, useLocation: () => ({ search: "?id=demo" }) }));
jest.mock("../../../../services/selectionService", () => ({
  getSelection: jest.fn(), getLoiReadiness: jest.fn(), generateSelectionLoi: jest.fn(), openSelectionLoiPdf: jest.fn(), sendSelectionLoi: jest.fn(),
  getSelectionDocuments: jest.fn(), openSelectionDocument: jest.fn(), requestDocumentResubmission: jest.fn(), verifySelectionDocuments: jest.fn(),
  getOfferReadiness: jest.fn(() => Promise.resolve({ ready: true })),
  getSelectionOffer: jest.fn(() => Promise.resolve(null)),
  getSelectionOfferHistory: jest.fn(() => Promise.resolve([])),
  getJoiningReadiness: jest.fn(() => Promise.resolve({ ready: true })),
  getJoining: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("../OfferWorkspace", () => ({ __esModule: true, default: () => null }));
jest.mock("../JoiningWorkspace", () => ({ __esModule: true, default: () => null }));
const demo = {
  _id: "demo", selectionNumber: "SEL-DEMO-001", candidate: { _id: "person", fullName: "Demo Candidate", email: "demo@example.com", mobile: "9000000000" },
  positionTitle: "Quality Inspector", status: "LOI_DRAFT", department: { name: "Quality" }, selectedAt: "2026-10-15",
  currentLoi: { _id: "letter", documentNumber: "LOI-DEMO-001", version: 1, issueDate: "2026-10-15" },
  workflow: { stageLabel: "Letter ready", nextActionLabel: "Review and send letter", progressPercent: 20 },
};
const documents = { personal: {}, bank: {}, employment: {}, currentDocuments: [{ _id: "doc", type: "PHOTO", originalName: "Demo photo.pdf", status: "SUBMITTED", size: 1000, version: 1 }], historicalDocuments: [] };
beforeEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
  getSelection.mockResolvedValue(demo);
  getSelectionDocuments.mockResolvedValue(documents);
  getLoiReadiness.mockResolvedValue({ ready: true });
  generateSelectionLoi.mockResolvedValue({});
  openSelectionLoiPdf.mockResolvedValue({});
  sendSelectionLoi.mockResolvedValue({});
  verifySelectionDocuments.mockResolvedValue({});
});
test("letter sending stays disabled until the current PDF is reviewed", async () => {
  render(<SelectionDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  expect(screen.getByRole("button", { name: "Send letter →" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Review letter" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Send letter →" })).toBeEnabled());
  expect(openSelectionLoiPdf).toHaveBeenCalledWith("demo");
  fireEvent.click(screen.getByRole("button", { name: "Send letter →" }));
  expect(sendSelectionLoi).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
test("letter preparation checks readiness before generation", async () => {
  getSelection.mockResolvedValue({ ...demo, status: "LOI_PENDING", currentLoi: null });
  render(<SelectionDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  fireEvent.click(screen.getByRole("button", { name: "Prepare intent letter" }));
  await screen.findByRole("dialog");
  expect(getLoiReadiness).toHaveBeenCalledWith("demo");
  expect(generateSelectionLoi).not.toHaveBeenCalled();
});
test("document verification still requires confirmation", async () => {
  getSelection.mockResolvedValue({ ...demo, status: "DOCUMENT_VERIFICATION", currentLoi: null });
  render(<SelectionDetailApp />);
  await screen.findByRole("button", { name: /Verify Documents/ });
  fireEvent.click(screen.getByRole("button", { name: /Verify Documents/ }));
  expect(verifySelectionDocuments).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  const buttons = within(dialog).getAllByRole("button");
  fireEvent.click(buttons[buttons.length - 1]);
  await waitFor(() => expect(verifySelectionDocuments).toHaveBeenCalledWith("demo"));
  await screen.findByText("Candidate ready for Offer");
});
test("Back uses the mobile selection list route", async () => {
  render(<SelectionDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  fireEvent.click(screen.getByRole("button", { name: "← Selected candidates" }));
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard?app=recruitment&page=selections");
});
test("optional previews use demo letter and document records", async () => {
  if (!process.env.SELECTION_PREVIEW_DIR) return;
  const fs = require("fs"), path = require("path");
  fs.mkdirSync(process.env.SELECTION_PREVIEW_DIR, { recursive: true });
  const css = ["../Selection.css", "../../Interviews/app/InterviewsApp.css", "SelectionsApp.css"].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  const wrap = html => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body>${html}</body></html>`;
  const result = render(<SelectionDetailApp />);
  await screen.findByRole("heading", { name: "Demo Candidate" });
  fs.writeFileSync(path.join(process.env.SELECTION_PREVIEW_DIR, "detail.html"), wrap(result.container.innerHTML));
  result.unmount();
  getSelection.mockResolvedValue({ ...demo, status: "DOCUMENT_VERIFICATION", currentLoi: null, workflow: { stageLabel: "Verify documents", nextActionLabel: "Check submitted files", progressPercent: 45 } });
  const second = render(<SelectionDetailApp />);
  await screen.findByRole("button", { name: /Verify Documents/ });
  fs.writeFileSync(path.join(process.env.SELECTION_PREVIEW_DIR, "documents.html"), wrap(second.container.innerHTML));
});

test("optional previews render the existing offer and joining components", async () => {
  if (!process.env.SELECTION_PREVIEW_DIR) return;
  const fs = require("fs"), path = require("path");
  const services = require("../../../../services/selectionService");
  services.getOfferReadiness.mockResolvedValue({ ready: true });
  services.getSelectionOffer.mockResolvedValue(null);
  services.getSelectionOfferHistory.mockResolvedValue([]);
  services.getJoiningReadiness.mockResolvedValue({ ready: true });
  services.getJoining.mockResolvedValue(null);
  const Offer = jest.requireActual("../OfferWorkspace").default;
  const Joining = jest.requireActual("../JoiningWorkspace").default;
  const css = ["../Selection.css", "../../Interviews/app/InterviewsApp.css", "SelectionsApp.css"].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
  const wrap = html => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}${css}</style></head><body>${html}</body></html>`;
  const first = render(<div className="se-iva se-sla se-sla-detail"><Offer selectionId="demo" selection={{ ...demo, status: "READY_FOR_OFFER" }} /></div>);
  await screen.findByRole("button", { name: /Prepare Offer/ });
  expect(screen.queryByText("Offer workspace unavailable")).not.toBeInTheDocument();
  fs.writeFileSync(path.join(process.env.SELECTION_PREVIEW_DIR, "offer.html"), wrap(first.container.innerHTML));
  first.unmount();
  const second = render(<div className="se-iva se-sla se-sla-detail"><Joining selectionId="demo" selection={{ ...demo, status: "OFFER_SENT" }} /></div>);
  await screen.findByRole("button", { name: /Start Joining/ });
  fs.writeFileSync(path.join(process.env.SELECTION_PREVIEW_DIR, "joining.html"), wrap(second.container.innerHTML));
});
