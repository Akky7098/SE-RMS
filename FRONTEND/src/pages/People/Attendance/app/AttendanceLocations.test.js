import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AttendanceLocations from "./AttendanceLocations";
import api from "../../../../services/api";
jest.mock("../../../../services/api", () => ({ get: jest.fn() }));
test("renders the saved street address and coordinates from an array response", async () => {
  api.get.mockResolvedValue({ data: { data: [{ latitude: 28.4, longitude: 77.3, locationAddress: "New Industrial Township, Faridabad, Haryana, 121001", capturedAt: "2026-10-16T09:00:00Z" }] } });
  render(<AttendanceLocations record={{ employeeId: { _id: "e1" }, businessDate: "2026-10-16" }} />);
  fireEvent.click(screen.getByRole("button", { name: "View recorded locations" }));
  expect(await screen.findByText("New Industrial Township, Faridabad, Haryana, 121001")).toBeInTheDocument();
  expect(screen.getByText("28.400000, 77.300000")).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/attendance/location/e1", expect.anything());
});
