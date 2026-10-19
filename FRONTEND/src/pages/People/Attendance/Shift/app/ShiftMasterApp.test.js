import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShiftMasterApp from "./ShiftMasterApp";
import { createAttendanceShift, updateAttendanceShift } from "../../../../../services/shiftService";
jest.mock("../../../../../services/shiftService", () => ({ createAttendanceShift: jest.fn(), updateAttendanceShift: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
test("master edits preserve attendance settings and need confirmation", async () => {
  updateAttendanceShift.mockResolvedValue({});
  const saved = jest.fn();
  render(<ShiftMasterApp shift={{ _id: "n", name: "Night", code: "NIGHT", type: "NIGHT", startTime: "17:30", endTime: "03:00", requiredMinutes: 480, timezone: "Asia/Kolkata", applicableGenders: ["MALE"], active: true }} onClose={jest.fn()} onSaved={saved} />);
  fireEvent.change(screen.getByLabelText("Shift name"), { target: { value: "Night duty" } });
  fireEvent.click(screen.getByRole("button", { name: "Review settings" }));
  expect(updateAttendanceShift).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm shift settings" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(updateAttendanceShift).toHaveBeenCalledWith("n", expect.objectContaining({ name: "Night duty", type: "NIGHT", startTime: "17:30", endTime: "03:00", requiredMinutes: 480, timezone: "Asia/Kolkata", applicableGenders: ["MALE"] }));
  expect(createAttendanceShift).not.toHaveBeenCalled();
});
