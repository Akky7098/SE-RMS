import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AddCandidateApp from "./AddCandidateApp";
import { checkCandidateDuplicate, createCandidate } from "../../../../services/recruitmentService";
import { deleteTemporaryResume, parseCandidateResume } from "../../../../services/resumeParserService";

jest.mock("../../../../services/recruitmentService", () => ({
  checkCandidateDuplicate: jest.fn(),
  createCandidate: jest.fn(),
}));
jest.mock("../../../../services/resumeParserService", () => ({
  parseCandidateResume: jest.fn(),
  deleteTemporaryResume: jest.fn(),
  normalizeResumeParseResult: value => value,
}));
jest.mock("../ResumeUploadPanel", () => ({
  __esModule: true,
  default: ({ onFileSelected }) => <button onClick={() => onFileSelected(
    new File(["demo"], "demo.pdf", { type: "application/pdf" })
  )}>Choose demo PDF</button>,
}));
const requirement = { _id: "role", positionTitle: "Fitter", requestNumber: "MPR-001" };
const parsed = {
  parsed: { fullName: "Demo Candidate", mobile: "9000000000", totalExperienceYears: 4 },
  resume: { tempFileName: "demo-temp.pdf" },
  matching: {}, parserMeta: {}, reviewFields: [], duplicate: null,
};
beforeEach(() => {
  jest.clearAllMocks();
  parseCandidateResume.mockResolvedValue(parsed);
  checkCandidateDuplicate.mockResolvedValue({ duplicate: false });
  createCandidate.mockResolvedValue({ _id: "created" });
  deleteTemporaryResume.mockResolvedValue({});
});

test("mobile Back closes and optional history starts collapsed", () => {
  const onClose = jest.fn();
  render(<AddCandidateApp open requirement={requirement} onClose={onClose} />);
  expect(screen.getByRole("dialog")).toHaveAccessibleName("Add candidate");
  expect(screen.getByText("Employment history").closest("details")).not.toHaveAttribute("open");
  expect(screen.getByRole("button", { name: /Create Candidate/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Back to candidates" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("Back cleans up a parsed temporary CV", async () => {
  const onClose = jest.fn();
  render(<AddCandidateApp open requirement={requirement} onClose={onClose} />);
  fireEvent.click(screen.getByText("Choose demo PDF"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Back to candidates" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Back to candidates" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(deleteTemporaryResume).toHaveBeenCalledWith("demo-temp.pdf");
});

test("reviewed data keeps duplicate recheck and candidate creation payload", async () => {
  const onCreated = jest.fn();
  render(<AddCandidateApp open requirement={requirement} onCreated={onCreated} />);
  fireEvent.click(screen.getByText("Choose demo PDF"));
  await waitFor(() => expect(screen.getByRole("button", { name: /Create Candidate/ })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: /Create Candidate/ }));
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ _id: "created" }));
  expect(checkCandidateDuplicate).toHaveBeenCalledWith({ mobile: "9000000000", email: "" });
  expect(createCandidate).toHaveBeenCalledWith("role", expect.objectContaining({
    fullName: "Demo Candidate", totalExperienceYears: 4,
    resume: expect.objectContaining({ tempFileName: "demo-temp.pdf" }),
  }));
});

test("validation errors receive focus and do not create a candidate", async () => {
  parseCandidateResume.mockResolvedValue({ ...parsed, parsed: { fullName: "" } });
  render(<AddCandidateApp open requirement={requirement} />);
  fireEvent.click(screen.getByText("Choose demo PDF"));
  await waitFor(() => expect(screen.getByRole("button", { name: /Create Candidate/ })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: /Create Candidate/ }));
  expect(screen.getByRole("alert")).toHaveTextContent("Candidate name is required");
  expect(screen.getByRole("alert")).toHaveFocus();
  expect(createCandidate).not.toHaveBeenCalled();
});
