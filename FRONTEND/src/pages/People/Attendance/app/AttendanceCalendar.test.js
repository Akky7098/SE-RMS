import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AttendanceCalendar from "./AttendanceCalendar";

test("calendar gives each recorded attendance status a distinct colour class", () => {
  const statuses = ["PRESENT", "ABSENT", "ON_LEAVE", "HALF_DAY", "WEEK_OFF", "HOLIDAY"];
  const tones = ["present", "absent", "leave", "half", "off", "holiday"];
  const records = statuses.map((presenceStatus, index) => ({ businessDate: `2026-10-0${index + 1}`, presenceStatus }));
  records.push({ businessDate: "2026-10-07", firstInAt: "2026-10-07T09:00:00Z" });
  render(<AttendanceCalendar month="2026-10" today="2026-10-15" records={records} onMonth={() => {}} onDay={() => {}} />);
  tones.forEach((tone, index) => expect(screen.getByRole("button", { name: new RegExp(`2026-10-0${index + 1}:`) })).toHaveClass(tone));
  expect(screen.getByRole("button", { name: "2026-10-07: Missing checkout" })).toHaveClass("missing");
  expect(screen.getByRole("button", { name: "2026-10-11: No record" })).toHaveClass("unknown");
  expect(screen.getByRole("button", { name: "2026-10-16: Upcoming" })).toHaveClass("unknown");
});

test("personal calendar shows missing attendance red, Sundays white and future weekdays neutral", () => {
  render(<AttendanceCalendar personal month="2026-10" today="2026-10-16" records={[
    { businessDate: "2026-10-04", presenceStatus: "PRESENT", firstInAt: "2026-10-04T09:00:00Z", lastOutAt: "2026-10-04T18:00:00Z" },
    { businessDate: "2026-10-06", synthetic: true }
  ]} onMonth={() => {}} onDay={() => {}} />);
  expect(screen.getByRole("button", { name: "2026-10-05: No attendance" })).toHaveClass("absent");
  expect(screen.getByRole("button", { name: "2026-10-06: No attendance" })).toHaveClass("absent");
  expect(screen.getByRole("button", { name: "2026-10-16: No attendance" })).toHaveClass("absent");
  expect(screen.getByRole("button", { name: "2026-10-11: Sunday" })).toHaveClass("personal-off");
  expect(screen.getByRole("button", { name: "2026-10-18: Sunday" })).toHaveClass("personal-off");
  expect(screen.getByRole("button", { name: "2026-10-17: Upcoming" })).toHaveClass("unknown");
  expect(screen.getByRole("button", { name: "2026-10-04: Present" })).toHaveClass("present");
});
