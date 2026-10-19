import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShiftAssignApp from "./ShiftAssignApp";
import { applyAssignmentPlan } from "./shiftAppData";
jest.mock("./shiftAppData", () => ({ ...jest.requireActual("./shiftAppData"), applyAssignmentPlan: jest.fn() }));
const people = [{ _id: "e1", fullName: "Machining Employee", employeeCode: "M01", orgUnitCode: "MACHINING" }, { _id: "e2", fullName: "Cutting Employee", employeeCode: "C01", orgUnitCode: "CUTTING" }];
const saved = jest.fn(), partial = jest.fn();
const show = () => render(<ShiftAssignApp employees={people} units={[{ code: "MACHINING", name: "Machining" }, { code: "CUTTING", name: "Cutting" }]} assignments={[]} rosters={[]} weekStart="2026-10-19" shifts={[{ _id: "n", name: "Night", type: "NIGHT", startTime: "17:30", endTime: "03:00", active: true }]} onClose={jest.fn()} onSaved={saved} onPartial={partial} />);
beforeEach(() => { jest.clearAllMocks(); applyAssignmentPlan.mockResolvedValue(1); });
const choose = () => {
  fireEvent.click(screen.getByRole("checkbox", { name: "Machining" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Machining Employee/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Mon 19" }));
};
test("department choices include machining and cutting, with explicit review before save", async () => {
  show();
  expect(screen.getByRole("checkbox", { name: "Cutting" })).toBeInTheDocument();
  choose();
  fireEvent.click(screen.getByRole("button", { name: "Review assignment →" }));
  expect(applyAssignmentPlan).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(applyAssignmentPlan).toHaveBeenCalledWith("2026-10-19", expect.objectContaining({ groups: [{ department: "MACHINING", employeeIds: ["e1"], dates: ["2026-10-19"] }] }), "SHIFT", "n");
});
test("changing departments clears selected employees", () => {
  show(); choose();
  fireEvent.click(screen.getByRole("checkbox", { name: "Cutting" }));
  expect(screen.getByText("0 selected")).toBeInTheDocument();
});
test("a partial-save error blocks blind repeat submission", async () => {
  applyAssignmentPlan.mockRejectedValue(new Error("Some entries may have been saved. Close and refresh."));
  show(); choose();
  fireEvent.click(screen.getByRole("button", { name: "Review assignment →" }));
  fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Some entries may have been saved");
  expect(screen.getByRole("button", { name: "Save assignment" })).toBeDisabled();
  expect(partial).toHaveBeenCalledTimes(1);
});
